var events = require("events");
var logger = require('../logger');
var db = require('../data/db')();
var wot = require('../framework');
var simulator = require('./simulator');

// start the device simulator
simulator.start();

var device = function () {

    var self = this;

    self.onProperty = function (id, callback) {
        simulator.emitter.on('device_property_changed', function (msg) {
            try {
                if (!msg || !msg.id || msg.id != id) {
                    return;
                }
                
                callback(null, msg.property, msg.value);                
            }
            catch (e) {
                logger.error(e);
            }
        });
    };
    
    self.onEvent = function (id, callback) {
        simulator.emitter.on('device_event_signalled', function (msg) {
            try {
                if (!msg || !msg.id || msg.id != id) {
                    return;
                }
                
                callback(null, msg.event, msg.data);
            }
            catch (e) {
                logger.error(e);
            }
        });
    };
    
    self.setProperty = function (id, property, value) {
        logger.debug("send patch to device: " + property + ", value " + value);
        var msg = {
            type: 'patch',
            id: id,
            property: property,
            value: value
        };
        simulator.emitter.emit("device_msg", msg);
    }
    
    self.action = function (id, action) {
        logger.debug("invoke action " + action + " at device simulator");
        var msg = {
            type: 'action',
            id: id,
            action: action
        };
        simulator.emitter.emit("device_msg", msg);
    }

    return self;
};

/* 
    The thing definition includes name, model, transport and implementation
    {
        "name": "door12",
         "transport": {
            "protocol": "http",
            "port": 11010
        },     
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

var d = new device();

//
//  The implementation of the things  
//
var things = [
    {
        "thing": function (callback) {
            db.find_thing("door12", callback);
        },
        "implementation": {
            start: function (thing) {
                //  listen on the property changes
                //  the device simulator will emit an event when any property change
                //  and this listener will be notified
                d.onProperty("door12", function (err, property, value) {
                    if (err) {
                        return logger.error("thing implementation onProperty error: " + err);
                    }

                    thing[property] = value;
                });
                
                d.onEvent("door12", function (err, event, data) {
                    if (err) {
                        return logger.error("thing implementation onEvent error: " + err);
                    }

                    thing.raise_event(event, data);
                });
                
                //  just for the demo set the camera state is "ON" (true)
                thing.is_camera_on = false;
                //  and let say the the door is closed
                thing.is_open = false;
            },
            stop: function (thing) { },
            //  must be the property set handler implemented here otherwise
            //  the client is unable to set the property
            patch: function (thing, property, value) {
                d.setProperty("door12", property, value);
            },
            unlock: function (thing) {
                logger.info('at implementation ' + thing.name + ' "unlock action invoked -> call the device');
                d.action("door12", 'unlock');
                //thing.is_open = true;
            },
            lock: function (thing) {
                logger.info('at implementation ' + thing.name + ' "lock" action invoked -> call the device');
                d.action("door12", 'lock');
            }
        }
    },
    {
        "thing": function (callback) {
            db.find_thing("switch12", callback);
        },        
        "implementation": {
            start: function (thing) {
                d.onProperty("switch12", function (err, property, value) {
                    thing[property] = value;
                });
                
                d.onEvent(function (err, event, data) {
                    
                });
            },
            stop: function (thing) { },
            patch: function (thing, property, value) {
                d.setProperty("door12", property, value);
            }
        }
    }
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


