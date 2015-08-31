var logger = require('../../logger');
var config = require('../../config');
var thingevents = require('../events/thingevents');

var Thing = exports.Thing = function Thing(name, protocol, model, implementation) {
    if (!name) {
        throw new Error("Error in creating Thing object, invalid thing name.");
    }
    if (!protocol) {
        throw new Error("Error in creating Thing object, invalid protocol name.");
    }
    if (!model) {
        throw new Error("Error in creating Thing object, invalid model.");
    }
    if (!implementation) {
        throw new Error("Error in creating Thing object, invalid implementation.");
    }
    
    var self = this;

    logger.debug("creating Thing: " + name);
    
    this.running = false;
    this.name = name;
    this.protocol = protocol;
    this.model = model;
    this.observers = {};
    this.properties = {};
    this.values = {};
    this.implementation = implementation;
    this.unresolved = 0;
    this.pending = {}; // for dependency

    this.init_events = function () {
        var thing = self;
        var events = thing.model["@events"];
        
        thing.raise_event = function (event_name, data) {
            var message = {
                name: thing.name,
                event: event_name,
                data: data
            }
            
            self._wsd.notify(message);
            //thing.emit('event', Thing, message);
        };
        
        for (var ev in events) {
            if (events.hasOwnProperty(ev))
                thing.observers[ev] = [];
        }
        
        thing.observe = function (name, handler) {
            var observers = thing.observers[name];
            
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
        
        thing.unobserve = function (name, handler) {
            var observers = thing.observers[name];
            
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
    this.init_properties = function () {
        var thing = self;

        // initialise getters and setters for properties
        // this doesn't yet validate property values
        // it also assumes all properties are writable (bad!)
        
        var properties = thing.model["@properties"];
        
        for (var prop in properties) {
            if (properties.hasOwnProperty(prop)) {
                thing.properties[prop] = null;
                (function (property) {
                    Object.defineProperty(thing, property, {
                        get: function () {
                            return thing.values[property];
                        },
                        
                        set: function (value) {
                            if (thing.running) {
                                logger.debug("setting " + thing.name + "." + property + " = " + value);
                                thing.values[property] = value;
                            }
                            
                            // signal the event handler that the propery has changed
                            thingevents.onPropertyChanged(thing.name, property, value);
                        }
                    });
                })(prop);
            }
        }
    }
    
    // initialise thing's actions
    // if ws is null, thing is local and we need
    // to bind the actions to the implementation
    this.init_actions = function () {
        var thing = self;

        // set up methods for invoking actions on proxied thing
        // this doesn't yet validate the action's data
        // this doesn't yet support results returned by actions
        // which would need to be handled asynchronously
        // most likely via returning a Promise for the result
        
        var actions = thing.model["@actions"];
        
        for (var act in actions) {
            if (actions.hasOwnProperty(act)) {
                (function (action) {
                    thing[action] = function (data) {
                        if (thing.running) {
                            logger.debug('invoking action: ' + thing.name + '.' + action + '()');
                            thing.implementation[action](thing, data);
                        } 
                        else {
                            // TODO
                            logger.debug('unable to invoke action: ' + thing.name + '.' + action + '() - the thing is not running');
                        }
                    }
                })(act);
            }
        }
    }
    
    // resolve all dependencies for this thing
    // these could be local things on this server
    // otherwise we need to create proxies for them
    // a given dependency must only be given once
    this.init_dependencies = function () {
        var thing = self;
        
        //  TODO
        
        /*
        var dependencies = thing.model["@dependencies"];
        var properties = thing.model["@properties"];
        var name, count = 0;
        
        // first count the number of dependencies
        for (name in dependencies) {
            if (dependencies.hasOwnProperty(name))
                ++count;
        }
        
        for (name in properties) {
            if (properties.hasOwnProperty(name) &&
                properties[name].type === "thing")
                ++count;
        }
        
        thing.unresolved = count;
        
        for (name in dependencies) {
            if (dependencies.hasOwnProperty(name)) {
                var uri = dependencies[name];
                
                // *** fix me - handle error on malformed uri ***
                uri = url.parse(url.resolve(thing.uri, uri)).href;
                
                var entry = registry[uri];
                
                if (entry)
                    resolve_dependency(thing, name, entry.thing, false);
                else {
                    var target = url.resolve(base_uri, uri);
                    record_dependency(thing, name, target);
                    
                    // create proxy if uri is for a remote thing
                    var options = url.parse(uri);
                    if (options.hostname !== 'localhost') {
                        register_proxy(uri, function (dependee) {
                        // nothing to do here
                        },
                        function (err) {
                            logger.error(err);
                        });
                    }
                }
            }
        }
        
        for (name in properties) {
            if (properties.hasOwnProperty(name) &&
        		properties[name].type === "thing") {
                var uri = properties[name].uri;
                
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
                        register_proxy(uri, function (dependee) {
                        // nothing to do here
                        },
                        function (err) {
                            logger.error(err);
                        });
                    }
                }
            }
        }
        */
    }
    
    this.register_proxy = function (uri, succeed, fail) {
        //  TODO   
    }
    
    // dependent is a thing, property is the property name for the dependee
    // and dependee is the *name*  for the thing this thing is depending on
    this.record_dependency = function (dependent, property, dependee) {
        //  TODO
        /*
        if (!pending[dependee])
            pending[dependee] = [];
        
        logger.debug(dependent._name + ' depends on ' + dependee);
        pending[dependee].push({
            property: property,
            dependent: dependent
        });
        */
    }
    
    this.resolve_dependency = function ( property, dependee, start) {
        var thing = self;
        logger.debug('setting ' + thing._name + "'s " + property + " to " + dependee._name);
        
        //  TODO
        //  resolve the dependency
    }
   
    this.init_events();
    this.init_properties();
    this.init_actions();
    this.init_dependencies();

    if (this.unresolved <= 0) {
        if (!this.running) {
            logger.debug("starting " + name);
            this.running = true;
            implementation.start(this);
        } 
        else {
            logger.debug(name + ' is already running');
        }
    } 
    else {
        logger.debug("deferring start of " + name + " until its dependencies are resolved");
    }
}

Thing.prototype.start = function () {
    var self = this;
    if (!self.running && self.implementation && self.implementation.start) {
        self.implementation.start(self);
        self.running = true;
    }
}

Thing.prototype.stop = function () {
    var self = this;
    if (self.running && self.implementation && self.implementation.stop) {
        self.implementation.stop(self);
        self.running = false;
    }
}

