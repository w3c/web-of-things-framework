var events = require("events");
var logger = require('../logger');

var EventEmitter = require("events").EventEmitter;
// event handler
var eventh = new EventEmitter();

var simulator = function ( thing) {
    logger.debug("starting device simulator " + thing.name);
    
    var model = thing.model;

    eventh.on('device_msg', function(data) {
        try {
            if (!data.type || !data.id || data.id != thing.name) {
                return;
            }
            
            logger.debug('device simulator received: ' + data.type + ' from ' + data.id);
            
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


var door = {
    "name": "door12",
    "model": {
        "events": {
            "bell": function () {
                //  Demonstrates to raise an event from the device by ringing the bell in every 30 seconds.
                //  This implementation emits an event to the WoT listner. This will be most likely an HTTP end point call 
                //  from the device to the WoT listener in real world applications, but for this demo example we just emit an event
                var ringbell = function () {
                    eventh.emit(
                        'device_event_signalled', 
                        {
                            id: 'door12',
                            event: 'bell',
                            data: {
                                // this will be some relevant device data instead of this demo timestamp value
                                timestamp: Math.floor(Date.now() / 1000)
                            }
                        }
                    );
                };
                setInterval(ringbell, 30000);
            },
        },
        // for patch include the writable properties from the data/dbs/file/db.js file
        "properties": {
            "is_camera_on": function (value){
                logger.debug('device simulator for door12 sets camera state to ' + value);
                // the property has changes at the the device, notify all clients
                eventh.emit(
                    'device_property_changed', 
                        {
                        id: 'door12',
                        property: 'is_camera_on',
                        value: value
                    }
                ); 
            },
            "battery_value": function() {
                //  put a timer to simulate a decreasing power consumption
                var voltage = 5;
                var setbatteryval = function () {
                    voltage = voltage - 0.001;
                    if (voltage < 1) {
                        voltage = 5;
                    }
                    voltage = parseFloat(voltage.toFixed(3));
                    //send the event
                    eventh.emit(
                        'device_property_changed', 
                        {
                            id: 'door12',
                            property: 'battery_value',
                            value: voltage
                        }
                    );
                };
                setInterval(setbatteryval, 10000);
            },
        },
        "actions": {
            "unlock": function () {
                // the simulator received the unlock request ... the door was unlocked ... set the "is_open" property to true
                logger.debug('device "unlock" action is invoked, the device is setting the is_open property to true');
                eventh.emit(
                    'device_property_changed', 
                    {
                        id: 'door12',
                        property: 'is_open',
                        value: true
                    }
                );
            },
            "lock": function () {
                logger.debug('device "lock" action is invoked, the device is setting the is_open property to true');
                eventh.emit(
                    'device_property_changed', 
                    {
                        id: 'door12',
                        property: 'is_open',
                        value: false
                    }
                );
            }
        }
    }
};

var lightswitch = {
    "name": "switch12",
    "model": {
        // for patch include the writable properties from the data/dbs/file/db.js file
        "properties": {
            "on": function (value) {
                logger.debug('switch12 sets on property to ' + value);
            },
            "power_consumption": function (value) {
                //  put a timer to simulate a decreasing power consumption
                var cons = 25;
                var setconsval = function () {
                    var cons = (Math.floor(Math.random() * 21)) * 0.001;
                    cons += 25;
                    cons = parseFloat(cons.toFixed(3));
                    //send the event
                    eventh.emit(
                        'device_property_changed', 
                        {
                            id: 'switch12',
                            property: 'power_consumption',
                            value: cons
                        }
                    );
                };
                setInterval(setconsval, 2000);
            }
        }
    }
};


exports.start = function start() {
    var door_device = new simulator(door);
    door.model.properties.battery_value();
    door.model.events.bell();
    
    var switch_device = new simulator(lightswitch);
    lightswitch.model.properties.power_consumption();
}

exports.emitter = eventh;