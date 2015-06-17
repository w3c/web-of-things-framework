
var url = require('url');
var util = require('util');
var wsd = require('./wsd.js'); // launch the web sockets server
var http = require('http');

// create new thing given its unique name, model and implementation
function ProxyThing(uri, onstart) {
    var self = this;

    var options = url.parse(uri);

    console.log("creating proxy at: " + options.href);

    self._name = "proxy";
    self._uri = options.href;
    self._model = {};
    self._observers = {};
    self._properties = {};
    self._values = {};
    self._queue = [];
    self._implementation = {};
    self._wsd = wsd;
    self.__queue = [];
    self._pending = {}; // mapping from uri to list of things with unresolved dependencies
    self._ws = undefined;
    self._onStart = onstart;

    self.init_events = function(thing) {
        var events = thing._model["@events"];

        thing._raise_event = function(name, data) {
            var message = {
                uri: thing._uri,
                event: name,
                data: data
            }

            self._wsd.notify(message);
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

            // check if self handler is already defined

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
    self.init_properties = function(thing) {
        // initialise getters and setters for properties
        // this doesn't yet validate property values
        // it also assumes all properties are writable (bad!)

        var properties = thing._model["@properties"];
        for (var prop in properties) {
            if (properties.hasOwnProperty(prop)) {
                thing._properties[prop] = null;

                (function(property) {
                    Object.defineProperty(thing, property, {
                        get: function() {
                            return thing._values[property];
                        },

                        set: function(value) {
                            thing._values[property] = value;
                            var message = {
                                uri: thing._uri,
                                patch: property,
                                data: value
                            };

                            self._ws.send(JSON.stringify(message));
                        }
                    });
                })(prop);
            }
        }
    }

    // initialise thing's actions
    // if ws is null, thing is local and we need
    // to bind the actions to the implementation
    self.init_actions = function(thing) {
        // set up methods for invoking actions on proxied thing
        // this doesn't yet validate the action's data
        // this doesn't yet support results returned by actions
        // which would need to be handled asynchronously
        // most likely via returning a Promise for the result

        var actions = thing._model["@actions"];

        for (var act in actions) {
            if (actions.hasOwnProperty(act)) {
                (function(action) {
                    thing[action] = function(data) {
                        var message = {
                            uri: thing._uri,
                            action: action,
                            data: data
                        };

                        self._ws.send(JSON.stringify(message));
                    };

                })(act);
            }
        }
    }

    self.launch_proxy = function(uri, succeed, fail) {
        // use HTTP to retrieve model
        console.log('connecting to ' + uri);

        var request = http.get(uri, function(response) {
            var body = '';
            response.on('data', function(d) {
                body += d;
            });

            response.on('end', function() {
                try {
                    var model = JSON.parse(body);
                    var options = url.parse(uri);

                    // now get a socket for the remote server
                    // first check if one already exists
                    self._wsd.connect(options.hostname, function(ws) {
                            succeed(ws, model);
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

    self.become_proxy = function(created, failed) {
        self.launch_proxy(self._uri, function succeed(ws, model) {
                self._ws = ws;
                self._model = model;

                self._wsd.register_proxy(options.href, self._ws);

                // now register proxy with the thing it proxies for
                var message = {
                    proxy: self._uri
                };

                self._ws.send(JSON.stringify(message));

                created(self);
            },
            function fail(msg) {
                failed(msg);
            });
    }

}

ProxyThing.prototype.initialize = function(succeed, fail) {
    var self = this;

    self.become_proxy(function(thing) {
        thing.init_events(self);
        thing.init_properties(self);
        thing.init_actions(self);
        succeed(thing);
    }, fail);
}

ProxyThing.prototype.start = function() {
    var self = this;

    if (!self._running) {
        if (self._onStart) {
            self._onStart(self);
        }
    }
}

ProxyThing.prototype.stop = function() {}

module.exports = ProxyThing;