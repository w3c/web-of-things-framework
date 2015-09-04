var events = require("events");
var logger = require('../logger');
var eventh = require('../libs/events/thingevents');

var simulator = function ( thing) {
    logger.debug("starting device simulator " + thing.name);
    
    var model = thing.model;

    eventh.emitter.on('device_msg', function(data) {
        try {
            if (!data.type || !data.name || data.name != thing.name) {
                return;
            }
            
            logger.debug('device simulator received: ' + data.type + ' from ' + data.name);
            
            //console.log(req.params);
            switch (data.type) {
                case 'action':
                    //  handle the action
                    var action = data.action;
                    if (model.actions[action]) {
                        model.actions[action]();
                    }
                    break;

                case 'patch':
                    //  set property
                    var property = data.property;
                    var value = data.value;
                    if (model.properties[property]) {
                        model.properties[property](value);
                    }
                    break;                

                default:
                    break;
            }
        }
        catch (e) {
            logger.error(e);
        }
    });
}



//  this is for the simulation to maintain the state of "on" between the "on" and "power_consumption" properties
var is_pump12_on;

var pump = {
    "name": "pump12",
    "model": {
        // for patch include the writable properties from the data/dbs/file/db.js file
        "properties": {
            "on": function (value) {
                logger.debug('pump12 sets on property to ' + value);
                // ... processing ... this will be asynchronous on real world devices
                // the property has changes at the the device, notify WoT about the change
                is_pump12_on = value;
                var data = {
                    name: 'pump12',
                    property: 'on',
                    value: value
                };
                eventh.onDevicePropertyChanged(data); 
            },
            "pressure": function (value) {
                //  put a timer to simulate a decreasing power consumption
                var setconsval = function () {
                    var cons = 0;
                    if (is_pump12_on) {
                        cons = (Math.floor(Math.random() * 21)) * 0.001;
                        cons += 1;
                        cons = parseFloat(cons.toFixed(3));
                    }
                    //send the event
                    var data = {
                        name: 'pump12',
                        property: 'pressure',
                        value: cons
                    };
                    eventh.onDevicePropertyChanged(data);
                };
                setInterval(setconsval, 2000);
            }
        }
    }
};


exports.start = function start() {
    var pump_device = new simulator(pump);
    pump.model.properties.on(true);
    pump.model.properties.pressure();
}

exports.emitter = eventh;