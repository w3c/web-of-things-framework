var url = require('url');
var EventEmitter = require('events').EventEmitter;
var util = require('util');
var wsd = require('./wsd.js'); // launch the web sockets server

// create new thing given its unique name, model and implementation
function Thing(base_uri, name, model, implementation) {
    var self = this;
    
    EventEmitter.call(self);
    
    var options = url.parse(url.resolve(base_uri, name));
    
    console.log("creating: " + name + " at " + options.href);

    self._base_uri = base_uri;
    self._name = name;
    self._uri = options.href;
    self._model = model;
    self._observers = {};
    self._properties = {};
    self._values = {};
    self._running = false;
    self._queue = [];
    self._implementation = implementation;
    self._wsd = wsd;
    self.__queue = [];
    self._pending = {}; // mapping from uri to list of things with unresolved dependencies
    self._ws = undefined;
     
    self.isLocal = function(otherUri) {
        var options = url.parse(url.resolve(self._base_uri, otherUri));
        var base = url.parse(self._base_uri);

        if ((options.hostname === base.hostname ||
                options.hostname === os.hostname()) &&
            options.port === base.port) {
            return true;
        }

        return false;
    }

    self.init_events = function(thing) {
        var events = thing._model["@events"];
        
        thing._raise_event = function (name, data) {
            var message = {
                uri: thing._uri,
                event: name,
                data: data
            }

            wsd.notify(message);
            //thing.emit('event', Thing, message);
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
            
            // check if self handler is already defined
            
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
            
            // search for self handler
            
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
    self.init_properties = function(thing, ws) {
        // initialise getters and setters for properties
        // this doesn't yet validate property values
        // it also assumes all properties are writable (bad!)
        
        var properties = thing._model["@properties"];
        
        if (ws) {
            for (var prop in properties) {
                if (properties.hasOwnProperty(prop)) {
                    thing._properties[prop] = null;
                    
                    (function (property) {
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
                    (function (property) {
                        Object.defineProperty(thing, property, {
                            get: function () {
                                return thing._values[property];
                            },
                            
                            set: function (value) {
                                if (thing._running) {
                                    console.log("setting " + thing._name + "." + property + " = " + value);
                                    thing._values[property] = value;
                                } else {
                                    self.queue_update(thing, property, value);
                                }

                                var message = {
                                    uri: thing._uri,
                                    patch: property,
                                    data: value
                                };
                                
                                self._wsd.notify(message);
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
    self.init_actions = function(thing, ws) {
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
                    (function (action) {
                        thing[action] = function (data) {
                            if (thing._running) {
                                console.log('invoking action: ' + thing._name + '.' + action + '()');
                                thing._implementation[action](thing, data);
                            } else
                                self.queue_act(thing, action, data);
                        }
                    })(act);
                }
            }
        }
    }
    
    self.drain_queues = function(thing) {
        for (var change in self._update_queue) {
                        
        }
    }
    
    self.flush_queue = function(thing) {
        for (var i = 0; i < thing._queue.length; ++i) {
            var entry = thing._queue[i];

            if (entry.name) {
                thing._values[entry.name] = entry.value;
            } else if (entry.act) {
                thing._implementation[entry.act](thing, entry.data);
            }
        }

        thing._queue = [];
    }
    
    self.queue_update= function(thing, name, value) {
        thing._queue.push({
            name: name,
            value: value
        });
    }
    
    self.queue_act = function(thing, act, data) {
        thing._queue.push({
            act: act,
            data: data
        });
    }
            
    self.launch_proxy = function (uri, succeed, fail) {
        // use HTTP to retrieve model
        console.log('connecting to ' + uri);
        
        var request = http.request(uri, function (response) {
            var body = '';
            response.on('data', function (d) {
                body += d;
            });
            
            response.on('end', function () {
                try {
                    var model = JSON.parse(body);
                    var options = url.parse(uri);

                    // now get a socket for the remote server
                    // first check if one already exists
                    wsd.connect(options.hostname, function (ws) {
                            succeed(ws);
                    },
                    function (err) {
                        fail(err);
                    });
                } catch (e) {
                    fail("unable to load " + uri + ", " + e);
                }
            });
        });
        
        request.on('error', function (err) {
            fail("couldn't load " + uri + ", error: " + err);
        });

    }
        
    self.become_proxy = function () {
        self.launch_proxy(options.href, function succeed(ws) {
            self._ws = ws;

            wsd.register_proxy(options.href, self._ws);

            // now register proxy with the thing it proxies for

            var message = {
                proxy: thing._uri
            };

            self._ws.send(JSON.stringify(message));
        },
        function fail(msg) {
            throw(msg);
        });
    }
    
    if (!self.isLocal(self._uri)) {
        self.become_proxy();
    }

    self.init_events(self);
    self.init_properties(self);
    self.init_actions(self);
}

Thing.prototype.start = function () {
    var self = this;
    if (!self._running && self._implementation && self._implementation.start) {
        self._implementation.start(self);
        self._running = true;

        self.flush(self);
    }
}

Thing.prototype.stop = function () {
    var self = this;
    if (self._running && self._implementation && self._implementation.stop) {
        self._implementation.stop(self);
        self._running = false;
    }
}

util.inherits(Thing, EventEmitter);

module.exports = Thing;