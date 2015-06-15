var wot = {
    things: {},

    start: function() {
        // same origin policy restricts this library to connecting to
        // HTTP and WebSockets servers with same origin as web page.
        // does XHR resolve relative URLs with respect to page origin?

        // initialise web socket connection for thing messages
        // use single connection for all things on the server

        var host = window.document.location.host.replace(/:.*/, '');
        this.ws = new WebSocket('ws://' + host + ':8080/webofthings');
        console.log("websocket connection opening ...");

        this.ws.onopen = function() {
            console.log("websocket connection opened");

            wot.get("/wot/door12", function(door) {
                console.log("door is ready");
                door.unlock();
            });

            wot.get("/wot/switch12", function(light) {
                console.log("light is ready");
                light.on = true;
            });
        };

        this.ws.onclose = function() {
            console.log("websocket connection closed");
        };

        this.ws.onerror = function() {
            console.log("websocket connection error");
        };

        this.ws.onmessage = function(message) {
            console.log("received message: " + message.data);
            try {
                var msg = JSON.parse(message.data);
                wot.dispatch_message(msg);
            } catch (e) {
                console.log("JSON syntax error in " + message.data);
            }
        };
    },

    // dispatch message from web socket connection
    dispatch_message: function(message) {
        var thing = this.things[message.uri];

        if (!thing) {
            console.log("unknown thing: " + message.uri);
            raise("unknown thing: " + message.uri);
        }

        if (message.event) // notify event to proxy
        {
            var observers = thing._observers[message.event];

            for (var i = 0; i < observers.length; ++i)
                observers[i](message.name, message.data);
        } else if (message.state) // update all properties on proxy 
        {
            var obj = message.state;

            for (var property in obj) {
                if (obj.hasOwnProperty(property)) {
                    thing._values[property] = obj[property];
                }
            }
        } else if (message.patch) // update named property on proxy
        {
            thing[message.patch] = message.data;
        } else
            console.log("unknown message type: " + JSON.stringify(message));
    },

    // creates proxy for thing from JSON-LD model
    setup_thing: function(uri, json, handler) {
        var thing = new function() {
            wot.init_proxy(this, uri, JSON.parse(json));
        };

        handler(thing);
    },

    // initialise thing with its uri and parsed JSON-LD model
    init_proxy: function(thing, uri, model) {
        var events = model["@events"];
        var properties = model["@properties"];
        var actions = model["@actions"];

        thing._uri = uri;
        thing._model = model;
        thing._observers = {};
        thing._properties = {};
        thing._values = {};

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

        // initialise getters and setters for properties
        // this doesn't yet validate property values
        // it also assumes all properties are writable (bad!)
        // *** fix me to honor writable meta-property ***
        for (var prop in properties) {
            if (properties.hasOwnProperty(prop)) {
                thing._properties[prop] = null;

                (function(property) {
                    Object.defineProperty(thing, property, {
                        get: function () {
                            return thing._values[property];
                        },
                        set: function (value) {
                            // should throw error if property isn't writeable
                            console.log("setting " + property + " = " + value);
                            thing._values[property] = value;
                            var message = {
                                uri: thing._uri,
                                patch: property,
                                data: value
                            };
                            
                            wot.ws.send(JSON.stringify(message));
                        }
                    });

                })(prop);
            }
        }

        // set up methods for invoking actions on proxied thing
        // this doesn't yet validate the action's data
        // this doesn't yet support results returned by actions
        // which would need to be handled asynchronously
        // most likely via returning a Promise for the result

        for (var act in actions) {
            if (actions.hasOwnProperty(act)) {
                (function(action) {
                    thing[action] = function (data) {
                        // invoke action on proxied thing
                        var message = {};
                        message.uri = thing._uri;
                        message.action = action;
                        message.data = data;
                        wot.ws.send(JSON.stringify(message));
                    };
                })(act);
            }
        }

        // now register proxy with thing's server

        var message = {
            proxy: uri
        };

        wot.ws.send(JSON.stringify(message));
        this.things[uri] = thing;
        console.log("registered: " + uri);
    },

    list: function(obj) {
        var s = "";

        for (var property in obj) {
            if (obj.hasOwnProperty(property)) {
                s += "\n" + property + ": " + obj[property];
            }
        }
        alert(s);
    },

    get: function(path, handler) {
        var req = new XMLHttpRequest();
        req.open("GET", path, true);
        req.setRequestHeader("Pragma", "no-cache");
        req.setRequestHeader("Cache-Control", "no-cache");
        req.setRequestHeader("Content-Type", "text/plain");
        req.onreadystatechange = function(evt) {
            if (req.readyState == 4) {
                if (req.status == 200) {
                    console.log(req.status + " Okay, " + req.responseText);

                    handler(new function() {
                        wot.init_proxy(this, path, JSON.parse(req.responseText));
                    });
                } else {
                    console.log(req.status + " Error, " + req.responseText);
                }
            }
        };

        req.send();
    }


};

window.addEventListener("load", function() {
    wot.start();
}, false);