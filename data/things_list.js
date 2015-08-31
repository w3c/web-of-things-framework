var logger = require('../logger');
var db = require('../data/db')();


/* 
    The thing definition includes name, model, protocol and implementation
    {
        "name": "door12",
        "protocol": "coap",
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


var things = [
    {
        "thing": function (callback) {
            db.find_thing("door12", callback);
        },
        "implementation": {
            start:
            function (thing) {
                thing.is_open = false;
                thing.battery_value = 4.5;  // some dummy value to test
                thing.is_alarm = false;
            },
            stop: function (thing) { },
            unlock: function (thing) {
                logger.info("unlocking " + thing.name);
                thing.is_open = true;
            },
            lock: function (thing) {
                logger.info("locking " + thing.name);
                thing.is_open = false;
            }
        }
    },
    {
        "thing": function (callback) {
            db.find_thing("switch12", callback);
        },        
        "implementation": {
            start: function(thing) {
                thing.on = true;
                thing.power_consumption = 24; // 24 watts, some dummy data for now
            },
            stop: function(thing) {},
        }
    }
];

module.exports = things;


