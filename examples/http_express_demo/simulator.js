var config = global.appconfig;

var logger = require('../../logger');
var http = require('http');
var restify = require('restify');

var COAP_RESULT_SUCCESS = 0;
var COAP_ERROR_INVALID_REQUEST = 1;
var COAP_ERROR_INVALID_REQUEST_FUNC = 2;
var COAP_SERVER_ERROR = 3;

function http_send(action, payload) {
    var url = config.servers.http.fqdn;
    var client = restify.createJsonClient({
        url: url,
        version: '*',
        agent: false
    });
    var path = '/api/thing/' + action;
    client.post(path, payload, function (err, req, res, data) {
        if (err) {
            return logger.error("Error in sending to /api/thing: " + err.message);
        }

        if (!data || !data.result) {
            logger.error("Error in in sending to /api/thing");
        }

        client.close();
    });

}

var simulator = function (app, thing, port) {
    logger.debug("starting HTTP device simulator for " + thing.name);

    var config = app.config || {};

    if (thing) {
        // keep reference to thing and its model
        app.thing = thing;
    }

    // create HTTP server and listen incoming request
    var server = http.createServer(app);

    server.listen(port, function () {
        logger.info('HTTP device simulator listener for thing ' + thing.name + ' started on port ' + port);
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
                        event: 'bell',
                        data: {
                            // this will be some relevant device data instead of this demo timestamp value
                            timestamp: Math.floor(Date.now() / 1000)
                        }
                    };
                    //send to the WoT CoAP server
                    http_send("eventsignall", data);
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
                    patch: 'is_camera_on',
                    data: value
                };
                //send to the WoT CoAP server
                http_send("propertychange", data);

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
                        patch: 'battery_value',
                        data: voltage
                    };
                    //send to the WoT CoAP server
                    http_send("propertychange", data);

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
                    patch: 'is_open',
                    data: true
                };
                door_prop_values["is_open"] = true;

                //send to new property to the WoT CoAP server
                http_send("propertychange", data);
            },
            "lock": function () {
                logger.debug('device "lock" action is invoked, the device is setting the is_open property to false');
                var data = {
                    thing: 'door12',
                    patch: 'is_open',
                    data: false
                };
                door_prop_values["is_open"] = false;
                //send to new property to the WoT CoAP server
                http_send("propertychange", data);
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
                    patch: 'on',
                    data: value
                };
                lightswitch_prop_values["on"] = value;

                //send to new property to the WoT CoAP server
                http_send("propertychange", data);
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
                        patch: 'power_consumption',
                        data: cons
                    };

                    lightswitch_prop_values["power_consumption"] = cons;

                    //send to new property to the WoT CoAP server
                    http_send("propertychange", data);
                };
                setInterval(setconsval, 10000);
            }
        }
    }
};

exports.start = function start(app) {
    logger.debug('Start device simulator to communicate with WoT via the HTTP protocol');
    var door_device = new simulator(app, door, 8890);
    door.model.properties.battery_value();
    door.model.events.bell();

    var switch_device = new simulator(app, lightswitch, 8891);
    lightswitch.model.properties.power_consumption();
}


