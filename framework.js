// wot-framework.js
var exports = module.exports = {};

var fs = require('fs');
var url = require('url');
var os = require('os');
var dns = require('dns');
var http = require('http');
var httpd = require('./httpd.js');  // launch the http server
var wsd = require('./wsd.js');  // launch the web sockets server
var base = 'http://localhost:8888/wot/'; // base URI for models on this server
var baseUri = url.parse(base);
var pending = {};  // mapping from uri to list of things with unresolved dependencies

// registry of locally hosted things with mapping from thing id to model, implementation and status
var registry = {};

httpd.set_registry(registry);  // pass reference to http server so it can serve up models
wsd.set_registry(registry);

// create new thing given its unique name, model and implementation
function thing(name, model, implementation) {
    console.log("creating: " + name);
    
    var options = url.parse(url.resolve(base, name));
    
    var thing = new function Thing() {
        this._name = name;
        this._uri = options.href;
        this._model = model;
        this._observers = {};
        this._properties = {};
        this._values = {};
        this._running = false;
        this._implementation = implementation;
        register_thing(model, this);
        
        init_events(this);
        init_properties(this);
        init_actions(this);
        init_dependencies(this);
        };
    
    // if no dependencies, start the new thing now if not already running
    
    if (thing._unresolved === 0 && !thing._running) {
        console.log("starting1: " + name);
        implementation.start(thing);
        thing._running = true;
    }
}

// create a proxy for a thing on a remote server
// will call handler(thing) once thing is ready
// handler is null if called from init_dependencies
function register_proxy(uri, succeed, fail) {
    var options = url.parse(url.resolve(base, uri));
    
    test_host(options.hostname, 
    function () {
        // local host so use local thing
        var thing = registry[options.href];
        
        if (thing)
            succeed(thing.thing);
        else // not yet created
        {
            console.log('waiting for ' + uri + ' to be created');
            record_handler(uri, succeed);
        }
    },
    function () {
        // remote host so find proxy
        console.log(options.hostname + " is remote");
        launch_proxy(options, succeed, fail);
    },
    function () {
        // unknown host name
        fail("server couldn't determine IP address for " + options.hostname);
    });
}

function register_thing(model, thing) {
    console.log('registering ' + thing._uri);
    registry[thing._uri] = { model: model, thing: thing };
}

function launch_proxy(options, succeed, fail) {
    // use HTTP to retrieve model
    console.log('connecting to ' + options.href);
    
    return http.get(options, function (response) {
        var body = '';
        response.on('data', function (d) {
            body += d;
        });
        
        response.on('end', function () {
            try {
                var model = JSON.parse(body);
                
                // now get a socket for the remote server
                // first check if one already exists
                wsd.connect(options.hostname, function (ws) {
                    create_proxy(options.href, model, ws, succeed);
                },
        function (err) {
                    fail(err);
                });
            } catch (e) {
                fail("couldn't load " + options.href + ", " + e);
            }
        });
        
        response.on('error', function (err) {
            fail("couldn't load " + options.href + ", error: " + err);
        });
    });
}

function unregister_proxy(uri) {
    // *** implement me *** needs to remove proxy from list of proxies for given uri
    console.log("*** unregister_proxy isn't implemented");
}

function create_proxy(uri, model, ws, handler) {
    console.log("register proxy: " + uri);
    
    var thing = new function Proxy() {
        this._uri = uri;
        this._model = model;
        this._observers = {};
        this._properties = {};
        this._values = {};
        this._running = false;
        register_thing(model, this);
        
        init_events(this);
        init_properties(this);
        init_actions(this);
        init_dependencies(this);
        };
    
    // register the new proxy
    registry[uri] = thing;
    //wsd.things[uri] = thing;
    wsd.register_proxy(uri, ws);
    
    // now register proxy with the thing it proxies for
    
    var message = {
        proxy: thing._uri
    };
    
    ws.send(JSON.stringify(message));
    handler(thing);
    
    console.log("registered: " + thing._uri);
}

function notify_dependents(dependee) {
    console.log('notify dependents on ' + dependee._name);
    var dependents = pending[dependee._name];
    
    if (dependents) {
        var s = "";
        for (var i = 0; i < dependents.length; ++i) {
            if (dependents[i].dependent._name)
                s += dependents[i].dependent._name + ' ';
        }
        console.log('dependents are: ' + s);
    } else
        console.log('no dependents');
    
    if (dependents) {
        for (var i = 0; i < dependents.length; ++i) {
            var dependency = dependents[i];
            
            if (dependency.handler) {
                dependency.handler(dependee);
            } else if (dependency.dependent) {
                var thing = dependency.dependent;
                var property = dependency.property;
                resolve_dependency(thing, property, dependee);
            }
        }
        
        delete pending[dependee._name];
    }
}

// someone wants to use a handler for a local
// thing that has yet to be created
function record_handler(dependee, handler) {
    if (!pending[dependee])
        pending[dependee] = [];
    
    pending[dependee].push({ handler: handler });
}

// dependent is a thing, property is the property name for the dependee
// and dependee is the *name*  for the thing this thing is depending on
function record_dependency(dependent, property, dependee) {
    if (!pending[dependee])
        pending[dependee] = [];
    
    pending[dependee].push({ property: property, dependent: dependent });
}

function resolve_dependency(thing, property, dependee) {
    console.log('setting ' + thing._name + "'s " + property + " to " + dependee._name);
    thing[property] = dependee;
    
    if (--thing._unresolved <= 0 && thing._implementation) {
        console.log("starting2: " + thing._name);
        thing._implementation.start(thing);
        thing._running = true;
    }
}

// resolve all dependencies for this thing
// these could be local things on this server
// otherwise we need to create proxies for them
// a given dependency must only be given once
function init_dependencies(thing) {
    var dependencies = thing._model["@dependencies"];
    var name, count = 0;
    
    // first count the number of dependencies
    for (name in dependencies) {
        if (dependencies.hasOwnProperty(name))
            ++count;
    }
    
    thing._unresolved = count;
    
    for (name in dependencies) {
        if (dependencies.hasOwnProperty(name)) {
            var uri = dependencies[name];
            console.log("dependee: " + uri);
            
            // *** fix me - handle malformed uri ***
            uri = url.parse(url.resolve(thing._uri, uri)).href;
            var entry = registry[uri];
            
            if (entry)
                resolve_dependency(thing, name, entry.thing);
            else {
                var target = url.resolve(base, uri);
                record_dependency(thing, name, target);
                
                // create proxy if uri is for a remote thing
                register_proxy(uri, function (dependee) {
                        // nothing to do here
                },
                    function (err) {
                    console.log(err);
                });
            }
        }
    }
    
    // some things may be waiting for this thing
    console.log("notifying dependents for " + thing._uri);
    notify_dependents(thing);
}

function init_events(thing) {
    var events = thing._model["@events"];
    
    thing._raise_event = function (name, data) {
        var message = {
            uri: thing._uri,
            event: name,
            data: data
        }
        
        wsd.notify(message);
    };
    
    for (var ev in events) {
        if (events.hasOwnProperty(ev))
            thing._observers[ev] = [];
    }
    
    thing._observe = function (name, handler) {
        var observers = thing._observers[name];
        
        // check handler is a function
        
        if (!(handler && getClass.call(handler) == '[object Function]'))
            throw ("event handler is not a function");
        
        // if observers is null, an illegal event name
        
        if (!observers)
            throw ("undefined event name");
        
        // check if this handler is already defined
        
        for (var i = 0; i < observers.length; ++i) {
            if (observers[i] == handler)
                return;
        }
        
        observers.push(handler);
    };
    
    thing._unobserve = function (name, handler) {
        var observers = thing._observers[name];
        
        // check handler is a function
        
        if (!(handler && getClass.call(handler) == '[object Function]'))
            throw ("event handler is not a function");
        
        // if observers is null, an illegal event name
        
        if (!observers)
            throw ("undefined event name");
        
        // search for this handler
        
        for (var i = 0; i < observers.length; ++i) {
            if (observers[i] == handler) {
                delete observers[i];
                return;
            }
        }
    };
}

// initialise thing's getters and setters
// if ws is null, thing isn't a proxy and hence
// we need to notify property changes to its proxies
function init_properties(thing, ws) {
    // initialise getters and setters for properties
    // this doesn't yet validate property values
    // it also assumes all properties are writable (bad!)
    
    var properties = thing._model["@properties"];
    
    if (ws) {
        for (var property in properties) {
            if (properties.hasOwnProperty(property)) {
                thing._properties[property] = null;
                
                (function (prop) {
                    Object.defineProperty(thing, prop, {
                        get: function () {
                            return thing._values[prop];
                        },
                        
                        set: function (value) {
                            thing._values[prop] = value;
                            var message = {
                                uri: thing._uri,
                                patch: prop,
                                data: value
                            };
                            
                            ws.send(JSON.stringify(message));
                        }
                    });
                    
                })(property);
            }
        }
    } else // local thing so notify all of its proxies
    {
        for (var property in properties) {
            if (properties.hasOwnProperty(property)) {
                thing._properties[property] = null;
                
                (function (prop) {
                    Object.defineProperty(thing, prop, {
                        get: function () {
                            return thing._values[prop];
                        },
                        
                        set: function (value) {
                            console.log("setting " + thing._name + "." + prop + " = " + value);
                            thing._values[prop] = value;
                            
                            var message = {
                                uri: thing._uri,
                                patch: prop,
                                data: value
                            };
                            
                            wsd.notify(message);
                        }
                    });

                })(property);
            }
        }
    }
}

// initialise thing's actions
// if ws is null, thing is local and we need
// to bind the actions to the implementation
function init_actions(thing, ws) {
    // set up methods for invoking actions on proxied thing
    // this doesn't yet validate the action's data
    // this doesn't yet support results returned by actions
    // which would need to be handled asynchronously
    // most likely via returning a Promise for the result
    
    var actions = thing._model["@actions"];
    
    if (ws) // proxied thing so pass to remote thing
    {
        for (var action in actions) {
            if (actions.hasOwnProperty(action)) {
                (function (act) {
                    thing[act] = function (data) {
                        var message = {
                            uri: thing._uri,
                            action: act,
                            data: data
                        };
                        
                        ws.send(JSON.stringify(message));
                    };
                })(action);
            }
        }
    } else // local thing so invoke implementation
    {
        for (var action in actions) {
            if (actions.hasOwnProperty(action)) {
                (function (act) {
                    thing[act] = function (data) {
                        thing._implementation[act](thing, data);
                    }

                })(action);
            }
        }
    }
}

function test_host(host, local, remote, unknown) {
    dns.resolve(host, function (err, addresses) {
        if (err) {
            if (unknown)
                unknown();
        } else {
            if (is_local(addresses))
                local();
            else
                remote();
        }
    });
}

// initialise list of local IP addresses
// assumes that network cards aren't hot plugged
// used to determine whether or not to create a proxy

var ifaces = os.networkInterfaces();
var localAddresses = [];

Object.keys(ifaces).forEach(function (ifname) {
    ifaces[ifname].forEach(function (iface) {
        localAddresses.push(iface.address);
    });
});

function is_local(addresses) {
    for (var i = 0; i < addresses.length; ++i) {
        var raddr = addresses[i];
        
        for (var j = 0; j < localAddresses.length; ++j) {
            if (localAddresses[j] === raddr)
                return true;
        }
    }
    
    return false;
}

exports.thing = thing;
exports.register_proxy = register_proxy;
