
// The main things definition for the server
// The WoT server will manage these things
var definitions = [];

definitions.push(
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
                "is_open": {
                    "type": "boolean"
                },
                "battery_value": {
                    "type": "numeric"
                },
                "is_alarm": {
                    "type": "boolean",
                    "writeable": true
                },
            },
            "@actions": {
                "unlock": null,
                "lock": null
            }
        }
    }
);

definitions.push(
    {
        "name": "switch12",
        "protocol": "coap",
        "model": {
            "@properties": {
                "on": {
                    "type": "boolean",
                    "writeable": true
                },
                "power_consumption": {
                    "type": "numeric"
                }
            }
        }
    }
);


exports.find_thing = function find_thing(name, callback) {
    var thing = null;
    for (i = 0; i < definitions.length; i++) {
        if (definitions[i].name == name) {
            thing = definitions[i];
            break;
        }
    }
    
    if (!thing) {
        return callback("thing " + name + " definition doesn't exists in the database");
    }
    
    //  return the name, protocol and model
    callback(null, thing);
}


// the "things" list is for the clients, typically this will be rendered to the client UI
var things = [];

things.push({ name: 'door12', id: 1 });
things.push({ name: 'switch12', id: 2 });


// all databases returns the data asynchronously so return from this local file asynchronously as well 
// to keep the implementation consistent
exports.things_list = function things_list( callback) {
    callback(null, things);
}


