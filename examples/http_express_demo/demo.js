// set this global config variable first
global.appconfig = require('./config');

// define what things will be handled by this demo
global.is_door12_defined = true;
global.is_switch12_defined = true;

var events = require("events");
var db = require('../../data/db')();
var wot = require('../../framework');
var simulator = require('./simulator');
var eventh = require('../../libs/events/thingevents');
var adapter = require('../../libs/adapters/http');
var express = require('express');
var bodyParser = require('body-parser');
var logger = require('../../logger');
var morgan = require('morgan')

var device = function (thing_name) {

    var self = this;

    self.property_get = function (property, callback) {
        logger.debug("get property from HTTP device: " + property );
        var msg = {
            type: 'property_get',
            name: thing_name,
            property: property
        };

        adapter.send(self.adapter_uri, "/", msg, function (err, result) {
            if (err) {
                return callback(err);
            }

            if (result && result.property && result.property == property && result.hasOwnProperty('value')) {
                callback(null, result.value);
            }
            else {
                callback("Invalid HTTP property_get response");
            }
        });
    }


    self.setProperty = function (property, value) {
        logger.debug("send patch to device: " + property + ", value " + value);
        var msg = {
            type: 'patch',
            name: thing_name,
            property: property,
            value: value
        };

        adapter.send(self.adapter_uri, "/", msg, function (err, result) {
            // TODO handles the result
        });
    }

    self.action = function (action) {
        logger.debug("invoke action " + action + " at device simulator");
        var msg = {
            type: 'action',
            name: thing_name,
            action: action
        };

        adapter.send(self.adapter_uri, "/", msg, function (err, result) {
            // TODO handles the result
        });
    }

    // create the HTTP adapter
    self.init = function(callback) {
        db.find_adapter(thing_name, "http", function (err, data) {
            if (err) {
                return callback(err);
            }

            //start the CoAP client/server
            if (!data || !data.device || !data.protocol || !data.host) {
                return callback("Invalid http adapter configuration data");
            }

            self.protocol = data.protocol;
            self.host = data.host;
            self.port = data.port;
            self.adapter_uri = self.protocol + "://" + self.host + ":" + self.port;

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
//  The implementations of the things
//

var door_device = new device("door12");
var switch_device = new device("switch12");

var things = [
    {
        "thing": function (callback) {
            db.find_thing("door12", callback);
        },
        "implementation": {
            start: function (thing) {
                door_device.init(function (err) {
                    if (err) {
                        return logger.error("HTTP door12 adapter initialisation error: " + err);
                    }
                });
            },
            stop: function (thing) {
                door_device.unbind(function (err) {
                    if (err) {
                        return logger.error("HTTP adapter unbind error: " + err);
                    }
                });
            },
            property_get: function (property, callback) {
                door_device.property_get(property, function (err, value) {
                    if (err) {
                        callback(err);
                        return logger.error("HTTP adapter property_get error: " + err);
                    }

                    callback(null, value);
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
    },
    {
        "thing": function (callback) {
            db.find_thing("switch12", callback);
        },
        "implementation": {
            start: function (thing) {
                switch_device.init(function (err) {
                    if (err) {
                        return logger.error("HTTP switch12 adapter initialisation error: " + err);
                    }
                });
            },
            stop: function (thing) {
                switch_device.unbind(function (err) {
                    if (err) {
                        return logger.error("HTTP adapter unbind error: " + err);
                    }
                });
            },
            property_get: function (property, callback) {
                switch_device.property_get(property, function (err, value) {
                    if (err) {
                        callback(err);
                        return logger.error("HTTP adapter property_get error: " + err);
                    }

                    callback(null, value);
                });
            },
            patch: function (thing, property, value) {
                switch_device.setProperty(property, value);
            }
        }
    } //,
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

// create express instance
var api = express();

// setup bodyParser middleware
api.use(bodyParser.json());
api.use(bodyParser.urlencoded({ extended: false }));

// setup the logger
api.use(morgan('combined', {stream: logger.stream}))

// keep reference to config
api.config = global.appconfig;

// mount the URL router onto 'api'
api.use('/', require('./api'));

// start the device HTTP simulator
simulator.start(api);
