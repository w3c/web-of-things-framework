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

var util = require("util");
var EventEmitter = require("events").EventEmitter;
var ds18b20 = require('ds18x20');

var device_description = 
 {
    "@context": "http://schema.org/",
    "metadata": {
        "device": "temperature_sensor",
        "name": "Temperature Sensor",
        "model": "DS18B20"
    },
    "encodings": ["JSON"],
    "interactions": [
        {
            "@type": "Property",
            "name": "temperature",
            "outputData": "xs:decimal",
            "writable": false
        },
        {
            "@type": "Event",
            "outputData": "xs:decimal",
            "name": "highTemperature"
        }
    ]
};

util.inherits(Sensor, EventEmitter);

function Sensor(options) {
    if (!(this instanceof Sensor)) {
        return new Sensor(options);
    }

    EventEmitter.call(this);
    
    this.id = options.id;
    this.device = 0;
    this.logger = options.logger;
    this.sample_interval = options.sample_interval;
    this.event_subscriptions = {};

    this.init();
}

Sensor.prototype.init = function () {
    try {
        var self = this;
        
        this.logger.debug('initializing ds18b20 sensor');

        ds18b20.isDriverLoaded(function (err, isLoaded) {
            self.logger.debug('ds18b20 driver loaded: ' + isLoaded);
            if (!isLoaded) {
                //  try to load the driver
                ds18b20.loadDriver(function (err) {
                    if (err) {
                        self.logger.error('Loading the driver failed. Error: %j', err)
                    }
                    else {
                        self.logger.debug('driver is loaded');
                        if (self.sample_interval) {
                            self.read_loop();
                        }
                    }
                });
            }
            else {
                if (self.sample_interval) {
                    self.read_loop();
                }
            }
        });

    }
    catch (err) {
        this.logger.error('ds18b20 init error: %j', err);
    }    
}

Sensor.prototype.read_loop = function () {
    try {
                
        var self = this;
        
        this.logger.debug('read from ds18b20 sensor');
        
        var list_of_sensors = ds18b20.list();
        this.logger.debug("ds18b20 sensors: %j", list_of_sensors );
        
        if (!list_of_sensors || list_of_sensors.length == 0) {
            return;
        }
        
        var device = list_of_sensors[0];
        
        this.timer = setInterval(
            function () {
                try {
                    ds18b20.get(device, function (err, temperature) {
                        if (err) {
                            return self.logger.error('ds18b20 read temperature error: %j', err);     
                        }

                        // raise the event
                        self.emit("temperature", temperature);
                    });
                }
                catch (err) {
                    this.logger.error('ds18b20 read error: %j', err);
                }
            },
            this.sample_interval
        );
        
        // set the device
        this.device = device;

    }
    catch (err) {
        this.logger.error('ds18b20 read error: %j', err);
    }
}

Sensor.prototype.read = function (property, callback) {
    try {
        
        if (property != "temperature") {
            throw new Error("invalid property name, temperature was expected")
        }
                
        if (!this.device) {
            var list_of_sensors = ds18b20.list();

            if (!list_of_sensors || list_of_sensors.length == 0) {
                return callback("no sensor device exists");
            }
            
            this.device = list_of_sensors[0];
        }
 
        ds18b20.get(this.device, function (err, temperature) {
            if (err) {
                callback('ds18b20 read temperature error: ' + err.message);
            }
            else {
                callback(null, temperature);
            }
        });            

    }
    catch (err) {
        callback('ds18b20 read error:' + err.message);
    }
}

Sensor.prototype.monitor_high_temperature = function (contact_name, event, threshold, interval, handlerfn) {
    try {
        var self = this;
        
        var timer = this.event_subscriptions[contact_name];
        if (timer) {
            clearTimeout(timer);
            this.event_subscriptions[contact_name] = 0;
        }

        this.event_subscriptions[contact_name] = setInterval(function () {
            self.read("temperature", function (err, value) {
                if (value > threshold) {
                    //  the temperature exceeds the threshold, raise the event
                    var payload = { device_id: self.id, event: event, value: value };
                    handlerfn(contact_name, payload);
                }
            });
        },
        interval);
    }
    catch (err) {
        this.logger.error("monitor_high_temperature error: %j", err);
    }
}

Sensor.prototype.subscribe_event = function (contact_name, event, data, handlerfn, callback) {
    try {
        if (!handlerfn || typeof handlerfn != "function") {
            throw new Error("invalid handlerfn function")
        }

        if (!event) {
            throw new Error("invalid event name")
        }
        
        if (!data) {
            throw new Error("invalid data parameter")
        }       
    
        if (event == "highTemperature") {
            if (!data.threshold) {
                throw new Error("invalid data threshold parameter")
            }
            
            var interval = data.interval || 30000;
            
            this.logger.debug("monitor_high_temperature threshold:" + data.threshold + ", interval: " + interval);
            
            this.monitor_high_temperature(contact_name, event, data.threshold, interval, handlerfn);
        }
        else {
            return callback("event subscription for " + event + " is not supported by the device");
        }

        callback();

    }
    catch (err) {
        callback('ds18b20 subscribe_event error:' + err.message);
    }
}

Sensor.prototype.get_description = function () {
    return device_description;
}

module.exports.init_sensor = function(options) {
    return new Sensor(options);
};