
var url = require('url');
var util = require('util');
var wsd = require('./wsd.js'); // launch the web sockets server

// create new thing given its unique name, model and implementation
function LocalThing(uri, name, model, implementation) {
    var self = this;

    console.log("creating local: " + name + " at " + uri);

    self._name = name;
    self._uri = uri;
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

    self.init_events = function(thing) {
        var events = thing._model["@events"];

        thing._raise_event = function(name, data) {
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

    self.queue_update = function(thing, name, value) {
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

    self.init_events(self);
    self.init_properties(self);
    self.init_actions(self);
}

LocalThing.prototype.start = function () {
    var self = this;
    if (!self._running && self._implementation && self._implementation.start) {
        self._implementation.start(self);
        self._running = true;

        self.flush_queue(self);
    }
}

LocalThing.prototype.stop = function() {
    var self = this;
    if (self._running && self._implementation && self._implementation.stop) {
        self._implementation.stop(self);
        self._running = false;
    }
}

module.exports = LocalThing;