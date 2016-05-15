/*
 
This file is part of Streembit application. 
Streembit is an open source project to create a real time communication system for humans and machines. 

Streembit is a free software: you can redistribute it and/or modify it under the terms of the GNU General Public License 
as published by the Free Software Foundation, either version 3.0 of the License, or (at your option) any later version.

Streembit is distributed in the hope that it will be useful, but WITHOUT ANY WARRANTY; without even the implied warranty of 
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the GNU General Public License for more details.

You should have received a copy of the GNU General Public License along with Streembit software.  
If not, see http://www.gnu.org/licenses/.
 
-------------------------------------------------------------------------------------------------------------------------
Author: Tibor Zsolt Pardi 
Copyright (C) 2016 The Streembit software development team
-------------------------------------------------------------------------------------------------------------------------

*/


'use strict';

var streembit = streembit || {};

streembit.config = require("./config.json");
streembit.ContactList = require("./contactlist");
streembit.DEFS = require("./appdefs.js");
streembit.PeerNet = require("./peernet");

streembit.DeviceHandler = (function (handler, logger, config, events) {
    
    var list_of_devices = {};
    
    handler.init = function () {
        var devices = config.devices;
        
        if (!devices || devices.length == 0) {
            logger.debug("No devices configured in the the config file.");
            return;
        }
        
        for (var i = 0; i < devices.length; i++) {
            var device = devices[i].device;
            if (device == "ds18b20") {
                var device_id = devices[i].id;
                var ds18b20 = require("./device/ds18b20");
                var options = {
                    logger: logger,
                    id: device_id,
                    sample_interval: devices[i].sample_interval
                };
                var sensor = ds18b20.init_sensor(options);
                sensor.on("temperature", function (value) {
                    logger.debug("device event temperature: " + value);
                });
                
                list_of_devices[device_id] = sensor;
            }
        }
    };
    
    handler.device_request = function (payload) {
        try {
            var sender = payload.sender;
            logger.debug("sending device_request to " + sender);
            
            var devdescs = [];
            
            var devices = config.devices;
            for (var i = 0; i < devices.length; i++) {
                var device = list_of_devices[devices[i].id];
                if (device) {
                    var desc = device["get_description"]();
                    if (desc) {
                        desc.id = device.id;
                        devdescs.push(desc);
                    }
                }
            }
            
            var contact = streembit.ContactList.get(sender);
            var message = { cmd: streembit.DEFS.PEERMSG_DEVDESC, devices: devdescs };
            streembit.PeerNet.send_peer_message(contact, message);

        }
        catch (err) {
            logger.error("DeviceHandler.device_request error: %j", err);
        }
    }
    
    handler.read_property = function (payload) {
        try {
            var sender = payload.sender;
            if (!sender) {
                throw new Error("read_request error: invalid sender parameter")
            }
            
            if (!payload.data) {
                throw new Error("read_request error: invalid data parameter")
            }
            
            if (!payload.data.id) {
                throw new Error("read_request error: invalid device id parameter")
            }
            
            // get the device name
            var device_id = payload.data.id.toLowerCase();        
            var device = list_of_devices[device_id];
            if (!device) {
                throw new Error("read_request error: the device does not exists in list_of_devices");
            }
            
            if (!payload.data.property) {
                throw new Error("read_request error: invalid property parameter")
            }
            
            var property = payload.data.property;
            
            //logger.debug("read request from " + sender + ", device id: " + device_id + " property: " + property);            
            
            device["read"](property, function (err, data) {
                var contact = streembit.ContactList.get(sender);
                var message = { cmd: streembit.DEFS.PEERMSG_DEVREAD_PROP_REPLY, payload: {  device_id: device_id, property: property, value: data }};
                streembit.PeerNet.send_peer_message(contact, message);
            });
                     
        }
        catch (err) {
            logger.error("DeviceHandler.device_request error: %j", err);
        }
    }
    
    handler.on_device_event = function (contact_name, payload) {
        try {
            var contact = streembit.ContactList.get(contact_name);
            var message = { cmd: streembit.DEFS.PEERMSG_DEV_EVENT, payload: payload};
            streembit.PeerNet.send_peer_message(contact, message);
        }
        catch (err) {
            logger.error("on_device_event error: %j", err);
        }
    };
    
    handler.device_event_subscribe = function (payload) {
        try {
            var contact_name = payload.sender;
            if (!contact_name) {
                throw new Error("read_request error: invalid sender parameter")
            }
            
            if (!payload.data) {
                throw new Error("read_request error: invalid data parameter")
            }
            
            if (!payload.data.id) {
                throw new Error("read_request error: invalid device id parameter")
            }
            
            // get the device name
            var device_id = payload.data.id.toLowerCase();
            var device = list_of_devices[device_id];
            if (!device) {
                throw new Error("read_request error: the device does not exists in list_of_devices");
            }
            
            if (!payload.data.event) {
                throw new Error("read_request error: invalid event parameter")
            }
            var event = payload.data.event;
            
            if(!payload.data.data) {
                throw new Error("read_request error: invalid data parameter")
            }
            var data = payload.data.data;
            
            logger.debug("event subscribe from " + contact_name + ", device id: " + device_id + " event: " + event );            
            
            device["subscribe_event"](contact_name, event, data, handler.on_device_event, function (err) {
                if (err) {
                    return logger.error("device_event_subscribe error: %j", err);
                }

                var contact = streembit.ContactList.get(contact_name);
                var message = { cmd: streembit.DEFS.PEERMSG_DEVSUBSC_REPLY, payload: { device_id: device_id, event: event } };
                streembit.PeerNet.send_peer_message(contact, message);
            });
                     
        }
        catch (err) {
            logger.error("device_event_subscribe error: %j", err);
        }
    }
    
    return handler;

}(streembit.DeviceHandler || {}, global.applogger, streembit.config, global.appevents));


module.exports = streembit.DeviceHandler;