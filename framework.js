// wot-framework.js
var exports = module.exports = {};

var assert = require('assert');
var os = require('os');
var fs = require('fs');
var url = require('url');
var http = require('http');
var httpd = require('./httpd.js'); // launch the http server
var wsd = require('./wsd.js'); // launch the web sockets server
var base_uri = 'http://localhost:8888/wot/'; // base URI for models on this server
var pending = {}; // mapping from uri to list of things with unresolved dependencies
var Thing = require('./thing.js');
var Registry = require('./registry.js');

// registry of locally hosted things with mapping from thing id to model, implementation and status
var registry = {};
var registry2 = new Registry(base_uri);

httpd.set_registry(registry); // pass reference to http server so it can serve up models
wsd.register_base_uri(base_uri);
console.log("this server thinks its hostname is " + os.hostname());

// create new thing given its unique name, model and implementation
function thing(name, model, implementation) {
    var thing = registry2.register(name, model, implementation);
    
    register_thing(model, thing);
    
    init_events(thing);
    init_properties(thing);
    init_actions(thing);
    init_dependencies(thing);

    // if no unresolved dependencies, start the new thing now if not already running

    if (thing._unresolved <= 0) {
        if (!thing._running) {
            console.log("starting1 " + name);
            thing._running = true;
            implementation.start(thing);
            flush_queue(thing);
        } else
            console.log(name + ' is already running');
    } else
        console.log("deferring start of " + name + " until its dependencies are resolved");


    // some things may be waiting for this thing
    notify_dependents(thing);
}

// create a proxy for a thing on a remote server
// will call handler(thing) once thing is ready
// handler is null if called from init_dependencies
function register_proxy(uri, succeed, fail) {
    var options = url.parse(url.resolve(base_uri, uri));
    var base = url.parse(base_uri);
    
    if ((options.hostname === base.hostname ||
    		options.hostname === os.hostname()) &&
    	options.port == base.port) {
        console.log('for this server so use local thing: ' + uri);
        var thing = registry[options.href];

        if (thing)
            succeed(thing.thing);
        else // not yet created
        {
            console.log('waiting for ' + uri + ' to be created');
            record_handler(uri, succeed);
        }
    }
    else // assume remote host
    {
        // remote host so find proxy
        console.log(options.href + " is another server");
        launch_proxy(options.href, succeed, fail);
    }
}

function register_thing(model, thing) {
    console.log('registering ' + thing._uri);
    registry[thing._uri] = {
        model: model,
        thing: thing
    };
    
    wsd.register_thing(thing);
}

function launch_proxy(uri, succeed, fail) {
    // use HTTP to retrieve model
    console.log('connecting to ' + uri);

    var request = http.request(uri, function(response) {
        var body = '';
        response.on('data', function(d) {
            body += d;
        });

        response.on('end', function() {
            try {
                var model = JSON.parse(body);

                // now get a socket for the remote server
                // first check if one already exists
                wsd.connect(options.hostname, function(ws) {
                        create_proxy(options.href, model, ws, succeed);
                    },
                    function(err) {
                        fail(err);
                    });
            } catch (e) {
                fail("unable to load " + uri + ", " + e);
            }
        });
    });
    
    request.on('error', function(err) {
        fail("couldn't load " + uri + ", error: " + err);
    });

}

function unregister_proxy(uri) {
    // *** implement me *** needs to remove proxy from list of proxies for given uri
    console.log("*** unregister_proxy isn't implemented");
}

function create_proxy(uri, model, ws, handler) {
    var options = url.parse(url.resolve(base_uri, uri));

    console.log("wot.register proxy: " + options.href);
    assert(options.hostname !== 'localhost', 'trying to register proxy for localhost');

    var thing = new function Proxy() {
        this._uri = options.href;
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
    registry[thing._uri] = thing;

    wsd.register_proxy(options.href, ws);

    // now register proxy with the thing it proxies for

    var message = {
        proxy: thing._uri
    };

    ws.send(JSON.stringify(message));
    handler(thing);

    console.log("registered: " + thing._uri);

    // some things may be waiting for this thing
    notify_dependents(thing);
}

function flush_queue(thing) {
    for (var i = 0; i < thing._queue.length; ++i) {
        var entry = thing._queue[i];

        if (entry.name)
            thing._values[entry.name] = entry.value;
        else if (entry.act)
            thing._implementation[entry.act](thing, entry.data);
    }

    delete thing._queue;
}

function queue_update(thing, name, value) {
    thing._queue.push({
        name: name,
        value: value
    });
}

function queue_act(thing, act, data) {
    thing._queue.push({
        act: act,
        data: data
    });
}

function notify_dependents(dependee) {
    var dependents = pending[dependee._uri];
    
    if (dependents) {
        console.log('resolving dependencies on ' + dependee._name);
        for (var i = 0; i < dependents.length; ++i) {
            var dependency = dependents[i];

            if (dependency.handler) {
                dependency.handler(dependee);
            } else if (dependency.dependent) {
                var thing = dependency.dependent;
                var property = dependency.property;
                resolve_dependency(thing, property, dependee, true);
            }
        }

        delete pending[dependee._name];
    }
}

// someone wants to use a handler for a local
// thing that has yet to be created
function record_handler(dependee, handler) {
    console.log('recording handler for ' + dependee);
    if (!pending[dependee])
        pending[dependee] = [];

    pending[dependee].push({
        handler: handler
    });
}

// dependent is a thing, property is the property name for the dependee
// and dependee is the *name*  for the thing this thing is depending on
function record_dependency(dependent, property, dependee) {
    if (!pending[dependee])
        pending[dependee] = [];

    console.log(dependent._name + ' depends on ' + dependee);
    pending[dependee].push({
        property: property,
        dependent: dependent
    });    
}

function resolve_dependency(thing, property, dependee, start) {
    console.log('setting ' + thing._name + "'s " + property + " to " + dependee._name);
    thing[property] = dependee;
    thing._unresolved--;

    if (start && thing._unresolved <= 0 && thing._implementation && !thing._running) {
        console.log('starting2 ' + thing._name);
        thing._running = true;
        thing._implementation.start(thing);
        flush_queue(thing);
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

            // *** fix me - handle error on malformed uri ***
            uri = url.parse(url.resolve(thing._uri, uri)).href;

            var entry = registry[uri];

            if (entry)
                resolve_dependency(thing, name, entry.thing, false);
            else {
                var target = url.resolve(base_uri, uri);
                record_dependency(thing, name, target);

                // create proxy if uri is for a remote thing
                var options = url.parse(uri);
                if (options.hostname !== 'localhost') {
                    register_proxy(uri, function(dependee) {
                        // nothing to do here
                        },
                        function(err) {
                            console.log(err);
                        });
                }
            }
        }
    }
}

function init_events(thing) {
    var events = thing._model["@events"];

    thing._raise_event = function(name, data) {
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

    thing._observe = function(name, handler) {
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

    thing._unobserve = function(name, handler) {
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
        for (var prop in properties) {
            if (properties.hasOwnProperty(prop)) {
                thing._properties[prop] = null;

                (function(property) {
                    Object.defineProperty(thing, property, {
                        get: function () {
                            return thing._values[property];
                        },
                        
                        set: function (value) {
                            thing._values[property] = value;
                            var message = {
                                uri: thing._uri,
                                patch: property,
                                data: value
                            };
                            
                            ws.send(JSON.stringify(message));
                        }
                    });
                })(prop);
            }
        }
    } else // local thing so notify all of its proxies
    {
        for (var prop in properties) {
            if (properties.hasOwnProperty(prop)) {
                thing._properties[prop] = null;
                (function(property) {
                    Object.defineProperty(thing, property, {
                        get: function () {
                            return thing._values[property];
                        },
                        
                        set: function (value) {
                            if (thing._running) {
                                console.log("setting " + thing._name + "." + property + " = " + value);
                                thing._values[property] = value;
                            } else
                                queue_update(thing, property, value);
                            
                            var message = {
                                uri: thing._uri,
                                patch: property,
                                data: value
                            };
                            
                            wsd.notify(message);
                        }
                    });
                })(prop);
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
        for (var act in actions) {            
            if (actions.hasOwnProperty(act)) {
                (function (action) {
                    thing[action] = function (data) {
                        var message = {
                            uri: thing._uri,
                            action: action,
                            data: data
                        };
                        
                        ws.send(JSON.stringify(message));
                    };
                
                })(act);
            }
        }
    } else // local thing so invoke implementation
    {
        for (var act in actions) {
            if (actions.hasOwnProperty(act)) {
                (function(action) {
                    thing[action] = function (data) {
                        if (thing._running) {
                            console.log('invoking action: ' + thing._name + '.' + action + '()');
                            thing._implementation[action](thing, data);
                        } else
                            queue_act(thing, action, data);
                    }                    
                })(act);
            }
        }
    }
}

exports.thing = thing;
exports.register_proxy = register_proxy;