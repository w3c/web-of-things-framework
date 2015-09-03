
// The main things definition for the server
// The WoT server will manage these things
var definitions = [];

definitions.push(
    {
        "name": "door12",
        // WoT communicates with the device via this
        "transport": {
            "protocol": "http",
            "uri": "http://127.0.0.1:11010"
        },      
        "model": {
            "@events": {
                "bell": null,
            },
            "@properties": {
                "is_open": {
                    "type": "boolean"
                },
                "battery_value": {
                    "type": "numeric"
                },
                "is_camera_on": {
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
        "transport": {
            "protocol": "http",
            "uri": "http://127.0.0.1:11011"
        },
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


