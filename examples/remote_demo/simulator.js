var events = require("events");
var logger = require('../../logger');
var eventh = require('../../libs/events/thingevents');

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
var device_name = "door33";
var is_door33_on;

var door = {
    "name": device_name,
    "model": {
        "events": {
            "bell": function () {
                //  Demonstrates to raise an event from the device by ringing the bell in every 30 seconds.
                //  This implementation emits an event to the WoT listner. This will be most likely an HTTP end point call 
                //  from the device to the WoT listener in real world applications, but for this demo example we just emit an event
                var ringbell = function () {
                    var data = {
                        name: device_name,
                        event: 'bell',
                        data: {
                            // this will be some relevant device data instead of this demo timestamp value
                            timestamp: Math.floor(Date.now() / 1000)
                        }
                    };
                    eventh.onDeviceEventSignalled(data);
                };
                
                setInterval(ringbell, 30000);
            },
        },
        // for patch include the writable properties from the data/dbs/file/db.js file
        "properties": {
            "on": function (value) {
                logger.debug('door33 sets on property to ' + value);
                // ... processing ... this will be asynchronous on real world devices
                // the property has changes at the the device, notify WoT about the change
                is_door33_on = value;
                var data = {
                    name: device_name,
                    property: 'on',
                    value: value
                };
                eventh.onDevicePropertyChanged(data); 
            },
            "temperature": function (value) {
                //  put a timer to simulate 
                var settempval = function () {
                    var celsius = (Math.floor(Math.random() * 990)) * 0.0001;
                    celsius += 20;
                    celsius = parseFloat(celsius.toFixed(4));
                    
                    //send the event
                    var data = {
                        name: device_name,
                        property: 'temperature',
                        value: celsius
                    };
                    eventh.onDevicePropertyChanged(data);
                };
                setInterval(settempval, 2000);
            }
        },
        "actions": {
            "unlock": function () {
                // the simulator received the unlock request ... the door was unlocked ... set the "is_open" property to true
                logger.debug('device "unlock" action is invoked, the device is setting the is_open property to true');
                var data = {
                    name: device_name,
                    property: 'is_open',
                    value: true
                };
                eventh.onDevicePropertyChanged(data);
            },
            "lock": function () {
                logger.debug('device "lock" action is invoked, the device is setting the is_open property to true');
                var data = {
                    name: device_name,
                    property: 'is_open',
                    value: false
                };
                eventh.onDevicePropertyChanged(data);
            }
        }
    }
};


exports.start = function start() {
    var door_device = new simulator(door);
    door.model.properties.on(true);
    door.model.properties.temperature();
    door.model.events.bell();
}

exports.emitter = eventh;