var config = global.appconfig;
var logger = require('../../logger');
var thingevents = require('../events/thingevents');
var restify = require('restify');

var Thing = exports.Thing = function Thing(name, model, implementation, remote) {
    if (!name) {
        throw new Error("Error in creating Thing object, invalid thing name.");
    }
    if (!model) {
        throw new Error("Error in creating Thing object, invalid model.");
    }
    if (!implementation) {
        throw new Error("Error in creating Thing object, invalid implementation.");
    }
    if (remote && !remote.uri) {
        throw new Error("For remote thing the uri must be defined");
    }
    
    var self = this;

    logger.debug("creating Thing: " + name);
    
    this.running = false;
    this.name = name;
    this.model = model;
    this.observers = {};
    this.properties = {};
    this.values = {};
    this.implementation = implementation;
    this.unresolved = 0;
    this.pending = {}; // for dependency
    this.isremote = remote != null ? true : false;
    this.remoteuri = remote ? remote.uri :  '';
    
    this.get_remote_client = function () {
        var client = restify.createJsonClient({
            url: this.remoteuri,
            version: '*',
            agent: false
        });
        return client;  
    };
    
    this.remote_action = function (action, data) {
        var client = this.get_remote_client();
        
        var params = {
            thing: this.name,
            action: action,
            data: data
        };
        client.post('/api/thing/action', params, function (err, req, res, data) {
            if (err) {
                logger.error("/api/thing/action error: " + err);
            }            
            else if (!data && !data.result) {
                logger.error("/api/thing/action error: invalid result");
            }
            
            client.close();
        });
    };
    
    this.remote_patch = function (property, value) {
        var client = this.get_remote_client();
        
        var params = {
            thing: this.name,
            patch: property,
            value: value
        };
        client.post('/api/thing/patch', params, function (err, req, res, data) {
            if (err) {
                logger.error("/api/thing/patch error: " + err);
            }            
            else if (!data && !data.result) {
                logger.error("/api/thing/patch error: invalid result");
            }

            client.close();
        });
    };

    this.remote_property_get = function (property, callback) {
        var client = this.get_remote_client();
        
        var params = {
            thing: this.name,
            property: property
        };
        client.post('/api/thing/property/get', params, function (err, req, res, data) {
            if (err) {
                return callback(err);
            }
            
            if (data && data.thing && data.property && data.value != undefined) {
                callback(null, data.value);
            }
            else {
                callback("property value is empty");
            }

            client.close();
        });
    };

    this.property_get = function (property, callback) {
        if (this.isremote == false) {
            var thing = self;
            if (thing.implementation.property_get && typeof thing.implementation.property_get === 'function') {
                thing.implementation.property_get(property, function (err, value) {
                    if (err) {
                        return callback('Error in populating implementation property value: ' + err);
                    }
                    // store the propoerty value
                    thing.values[property] = value;
                    callback(null, value); 
                });
            }
            else {
                callback(null, this.values[property]);
            }
        }
        else {
            try {
                if (this.values[property] == undefined) {
                    this.remote_property_get(property, function (err, result) {
                        if (err) {
                            return callback('Error in populating remote property value: ' + err);
                        }
                        //  received the property value from the remote server, set it 
                        self.values[property] = result;
                        callback(null, self.values[property]);
                    });
                }
                else {
                    callback(null, this.values[property]);
                }
            }
            catch (e) {
                logger.error('Error in populating remote property value: ' + e.message);
            }
        }
    };
    
    this.init_events = function () {
        var thing = self;
        var events = thing.model["@events"];
        
        thing.raise_event = function (event_name, data) {
            // signal the event handler that the propery has changed
            thingevents.onEventSignalled(thing.name, event_name, data);
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
                            //logger.debug("setting " + thing.name + "." + property + " = " + value);
                            thing.values[property] = value;                            
                            
                            // signal the event handler to send the propery value
                            thingevents.onProperty(thing.name, property, value);
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
                        try {
                            if (thing.isremote == false) {
                                logger.debug('invoking action: ' + thing.name + '.' + action + '()');
                                thing.implementation[action](thing, data);
                            } 
                            else {
                                // call the remote WoT server that handles the thing
                                thing.remote_action(action, data);
                            }
                        }
                        catch (e) {
                            logger.error('Error in invoking action: ' + e.message);
                        }
                    }
                })(act);
            }
        }
    }
    
    // initialise thing's patch handler
    this.init_patch = function () {
        var thing = self;
        (function () {
            thing.patch = function (property, data) {
                try {
                    if (thing.isremote == false) {
                        logger.debug('Invoking patch handler. thing: ' + thing.name + ' property:' + property + '()');
                        thing.implementation.patch(thing, property, data);
                    } 
                    else {
                        //  call the remote WoT server that handles the thing
                        thing.remote_patch(property, data);
                    }
                }
                catch (e) {
                    logger.error('Error in invoking patch: ' + e.message);
                }
            }
        })();        
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
        //logger.debug('setting ' + thing._name + "'s " + property + " to " + dependee._name);
        
        //  TODO
        //  resolve the dependency
    }
    
    this.register_proxy = function () {
        if (!this.isremote) {
            //  this is not a remote thing -> no need to register this endpoint
            return;
        }

        var client = this.get_remote_client();
        
        var thingname = this.name;
        var params = {
            endpoint: config.servers.http.fqdn,
            thing: thingname
        };
        client.post('/api/endpoint/register', params, function (err, req, res, data) {
            if (err) {
                return logger.error("Error in registering the '" + thingname + "' remote proxy: " + err);
            }
            
            if (!data || !data.result) {
                logger.error("Error in registering the remote proxy");
            }
            else {
                logger.info("Remote proxy is registered for " + self.name);
            }
        });
    }   
    
    try {
        this.init_events();
        this.init_properties();
        this.init_actions();
        this.init_dependencies();
        this.init_patch();
        this.register_proxy();

        logger.debug("starting " + name);
        this.running = true;
        implementation.start(this);
    }
    catch (e) {
        logger.error("Error in initialising thing: " + e.message);
    }
}

