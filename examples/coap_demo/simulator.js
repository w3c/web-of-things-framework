var logger = require('../../logger');
var coap = require('coap');

var COAP_RESULT_SUCCESS = 0;
var COAP_ERROR_INVALID_REQUEST = 1;
var COAP_ERROR_INVALID_REQUEST_FUNC = 2;
var COAP_SERVER_ERROR = 3;

function coap_send(data) {
    var req = coap.request('coap://localhost'); // the WoT server listen on dafault port
    
    req.write(JSON.stringify(data));
    
    req.on('response', function (res) {
        try {
            if (res && res.payload && res.payload.length) {
                //var msg = JSON.parse(res.payload.toString());
                logger.debug("CoAP server response: " +  res.payload.toString());
            }
            res.on('end', function () {
            })
        }
        catch (e) {
            logger.error("coap send error: " + e.message);
        }
    })
    
    req.end();
}

var simulator = function ( thing, port) {
    logger.debug("starting coap device simulator for " + thing.name);
    
    var model = thing.model;

    var server = coap.createServer();
    
    server.on('request', function (req, res) {
        if (!req.payload || !req.payload.length) {
            return res.end(JSON.stringify({ "error": COAP_ERROR_INVALID_REQUEST }));
        }
        
        try {
            var data = JSON.parse(req.payload.toString());
            if (!data.type || !data.name || data.name != thing.name) {
                return;
            }
            
            logger.debug('CoAP device simulator received: ' + data.type + ' from ' + data.name);
            
            //console.log(req.params);
            switch (data.type) {
                case 'action':
                    //  handle the action
                    var action = data.action;
                    if (model.actions[action]) {
                        model.actions[action]();
                    }
                    res.end(JSON.stringify({ "result": COAP_RESULT_SUCCESS }));
                    break;
            
                case 'patch':
                    //  set property
                    var property = data.property;
                    var value = data.value;
                    if (model.properties[property]) {
                        model.properties[property](value);
                    }
                    res.end(JSON.stringify({ "result": COAP_RESULT_SUCCESS }));
                    break;                
            
                case 'property_get':
                    //  get property
                    var property = data.property;
                    var value = model.properties.get(property);
                    res.end(JSON.stringify({ "property": property, "value": value }));
                    break;

                default:
                    break;
            }
        }
        catch (e) {
            logger.error(e);
            return res.end(JSON.stringify({ "error": COAP_SERVER_ERROR }));
        }       
        
    });
    
    server.listen(port, null, function () {
        logger.info('CoAP device simulator listener for thing ' + thing.name + ' started on port ' + port);
    });
}

var door_prop_values = {};
// set by default the door to closed and camera to turned off
door_prop_values["is_open"] = false;
door_prop_values["is_camera_on"] = false;
door_prop_values["battery_value"] = 0;

var door = {
    "name": "door12",
    "model": {
        "events": {
            "bell": function () {
                //  Demonstrates to raise an event from the device by ringing the bell in every 30 seconds.
                //  This implementation emits an event to the WoT listner. This will be most likely an HTTP end point call 
                //  from the device to the WoT listener in real world applications, but for this demo example we just emit an event
                var ringbell = function () {
                    var data = {
                        thing: 'door12',
                        func: 'eventsignall',
                        event: 'bell',
                        data: {
                            // this will be some relevant device data instead of this demo timestamp value
                            timestamp: Math.floor(Date.now() / 1000)
                        }
                    };                    
                    //send to the WoT CoAP server
                    coap_send(data);
                };

                setInterval(ringbell, 30000);
            },
        },
        // for patch include the writable properties from the data/dbs/file/db.js file
        "properties": {
            "get": function (property) {
                return door_prop_values[property];
            },
            "is_camera_on": function (value){
                logger.debug('device simulator for door12 sets camera state to ' + value);
                // ... processing ... this will be asynchronous on real world devices
                // the property has changes at the the device, notify WoT about the change
                var data = {
                    thing: 'door12',
                    func: 'patch',
                    property: 'is_camera_on',
                    value: value
                };                
                //send to the WoT CoAP server
                coap_send(data);

                door_prop_values["is_camera_on"] = value;
            },
            "battery_value": function () {
                //  put a timer to simulate a decreasing power consumption
                var voltage = 5;
                var setbatteryval = function () {
                    voltage = voltage - 0.001;
                    if (voltage < 1) {
                        voltage = 5;
                    }
                    voltage = parseFloat(voltage.toFixed(3));
                    var data = {
                        thing: 'door12',
                        func: 'patch',
                        property: 'battery_value',
                        value: voltage
                    };
                    //send to the WoT CoAP server
                    coap_send(data);

                    door_prop_values["battery_value"] = voltage;
                };
                setInterval(setbatteryval, 10000);
            },
        },
        "actions": {
            "unlock": function () {
                // the simulator received the unlock request ... the door was unlocked ... set the "is_open" property to true
                logger.debug('device "unlock" action is invoked, the device is setting the is_open property to true');
                var data = {
                    thing: 'door12',
                    func: 'patch',
                    property: 'is_open',
                    value: true
                };
                door_prop_values["is_open"] = true;

                //send to new property to the WoT CoAP server
                coap_send(data);
            },
            "lock": function () {
                logger.debug('device "lock" action is invoked, the device is setting the is_open property to false');
                var data = {
                    thing: 'door12',
                    func: 'patch',
                    property: 'is_open',
                    value: false
                };
                door_prop_values["is_open"] = false;
                //send to new property to the WoT CoAP server
                coap_send(data);
            }
        }
    }
};

////  this is for the simulation to maintain the state of "on" between the "on" and "power_consumption" properties

lightswitch_prop_values = {};
lightswitch_prop_values["on"] = false;
lightswitch_prop_values["power_consumption"] = 0;

var lightswitch = {
    "name": "switch12",
    "model": {
        // for patch include the writable properties from the data/dbs/file/db.js file
        "properties": {
            "get": function (property) {
                return lightswitch_prop_values[property];
            },
            "on": function (value) {
                logger.debug('switch12 sets on property to ' + value);
                // ... processing ... this will be asynchronous on real world devices
                // the property has changes at the the device, notify WoT about the change
                is_switch12_on = value;
                var data = {
                    thing: 'switch12',
                    func: 'patch',
                    property: 'on',
                    value: value
                };
                lightswitch_prop_values["on"] = value;

                //send to new property to the WoT CoAP server
                coap_send(data);
            },
            "power_consumption": function (value) {
                //  put a timer to simulate a decreasing power consumption
                var setconsval = function () {
                    var cons = 0;
                    var is_switch12_on = lightswitch_prop_values["on"];
                    if (is_switch12_on) {
                        cons = (Math.floor(Math.random() * 21)) * 0.001;
                        cons += 25;
                        cons = parseFloat(cons.toFixed(3));
                    }
                    //send the event
                    var data = {
                        thing: 'switch12',
                        func: 'patch',
                        property: 'power_consumption',
                        value: cons
                    };
                    
                    lightswitch_prop_values["power_consumption"] = cons;

                    //send to new property to the WoT CoAP server
                    coap_send(data);
                };
                setInterval(setconsval, 10000);
            }
        }
    }
};


exports.start = function start() {
    logger.debug('Start device simulator to communicate with WoT via the CoAP protocol');
    var door_device = new simulator(door, 5685);
    door.model.properties.battery_value();
    door.model.events.bell();
    
    var switch_device = new simulator(lightswitch, 5686);
    lightswitch.model.properties.power_consumption();
}
