// set this global config variable first
global.appconfig = require('./config');
var events = require("events");
var logger = require('../../logger');
var db = require('../../data/db')();
var wot = require('../../framework');
var simulator = require('./simulator');
var eventh = require('../../libs/events/thingevents');
var adapter = require('../../libs/adapters/coap');

var device = function (thing_name) {

    var self = this;
    
    self.onProperty = function (callback) {
        //eventh.emitter.on('device_property_changed', function (msg) {
        //    try {
        //        if (!msg || !msg.name || msg.name != thing_name) {
        //            return;
        //        }
                
        //        callback(null, msg.property, msg.value);                
        //    }
        //    catch (e) {
        //        logger.error(e);
        //    }
        //});

        //listen on the coap message
    };
    
    self.onEvent = function (callback) {
        //eventh.emitter.on('device_event_signalled', function (msg) {
        //    try {
        //        if (!msg || !msg.name || msg.name != thing_name) {
        //            return;
        //        }
                
        //        callback(null, msg.event, msg.data);
        //    }
        //    catch (e) {
        //        logger.error(e);
        //    }
        //});

        //listen on the coap message
    };
    
    self.setProperty = function (property, value) {
        logger.debug("send patch to device: " + property + ", value " + value);
        var msg = {
            type: 'patch',
            name: thing_name,
            property: property,
            value: value
        };
        //eventh.onDeviceMessage(msg);
        adapter.patch(msg, function (err, result) {

        });
    }
    
    self.action = function (action) {
        logger.debug("invoke action " + action + " at device simulator");
        var msg = {
            type: 'action',
            name: thing_name,
            action: action
        };
        //eventh.onDeviceMessage(msg);
        adapter.action(msg, function (err, result) {

        });
    }
    
    // create the CoAP adapter
    self.init = function(callback) {
        db.find_adapter(thing_name, "coap", function (err, data) {
            if (err) {
                return callback(err);
            }
            
            //start the CoAP client/server
            if (!data || !data.device || !data.protocol || !data.uri) {
                return callback("Invalid adapter configuration data");
            }
            
            adapter.init(data, function (err) {
                callback(err);
            });

        });
    }
    
    self.unbind = function (callback) {
        adapter.unbind(function (err) {
            callback(err);
        });
    }

    return self;
    
};

/* 
    The thing definition includes name, model and implementation
    {
        "name": "door12",    
        "model": {
            "@events": {
                "bell": null,
                "key": {
                    "valid": "boolean"
                }
            },
            "@properties": {
                "is_open": "boolean"
            },
            "@actions": {
                "unlock": null
            }
        }
    The name must be unique. The unique id is enforced in the database with unique indexes or in the local list file by looking up if the name already exists
    The protocol inicates how the thing communicate with the WoT server, could be CoAP, mqtt, restapi, etc.
*/



//
//  The implementation of the things  
//

 var door_device = new device("door12");

var things = [
    {
        "thing": function (callback) {
            db.find_thing("door12", callback);
        },
        "implementation": {
            start: function (thing) {
               
                door_device.init(function (err) {
                    if (err) {
                        return logger.error("CoAP adapter initialisation error: " + err);
                    }

                    //  listen on the property changes
                    //  the device simulator will emit an event when any property change
                    //  and this listener will be notified
                    door_device.onProperty(function (err, property, value) {
                        if (err) {
                            return logger.error("thing implementation onProperty error: " + err);
                        }

                        thing[property] = value;
                    });
                
                    door_device.onEvent(function (err, event, data) {
                        if (err) {
                            return logger.error("thing implementation onEvent error: " + err);
                        }

                        thing.raise_event(event, data);
                    });
                
                    //  just for the demo set the camera state is "ON" (true)
                    //thing.is_camera_on = false;
                    //  and let say the the door is closed
                    //thing.is_open = false;
                });
            },
            stop: function (thing) {
                door_device.unbind(function (err) {
                    if (err) {
                        return logger.error("CoAP adapter unbind error: " + err);
                    }
                });
            },
            //  must be the property set handler implemented here otherwise
            //  the client is unable to set the property
            patch: function (thing, property, value) {
                door_device.setProperty(property, value);
            },
            unlock: function (thing) {
                logger.info('at implementation ' + thing.name + ' "unlock action invoked -> call the device');
                door_device.action('unlock');
            },
            lock: function (thing) {
                logger.info('at implementation ' + thing.name + ' "lock" action invoked -> call the device');
                door_device.action('lock');
            }
        }
    } //,
    //{
    //    "thing": function (callback) {
    //        db.find_thing("switch12", callback);
    //    },        
    //    "implementation": {
    //        start: function (thing) {
    //            d.onProperty("switch12", function (err, property, value) {
    //                thing[property] = value;
    //            });
    //            // turn off the light at start
    //            // the client from the web UI can turn on then
    //            thing.on = false;
    //        },
    //        stop: function (thing) { },
    //        patch: function (thing, property, value) {
    //            d.setProperty("switch12", property, value);
    //        }
    //    }
    //},
    ////  implement a remote sensor handled by other WoT server
    //{
    //    "thing": function (callback) {
    //        db.find_thing("door33", callback);
    //    },        
    //    "implementation": {
    //        start: function (thing) {
    //            d.onProperty("door33", function (err, property, value) {
    //                thing[property] = value;
    //            });
    //        },
    //        stop: function (thing) { }
    //    }
    //}
];

// call the framework initialisation method and pass an array of things definitions to the framework
// for this demo the things are defined here
try {
    logger.debug("Calling framework init()");
    wot.init(things);
}
catch (e) {
    logger.error("Error in initialising framework " + e.message);
}


// start the device CoAP simulator
simulator.start();
