
// The main things definition for the server
// The WoT server will manage these things
var definitions = [];

definitions.push(
    {
        "name": "door33",
        "model": {
            "@events": {
                "bell": {
                    fields: [
                        "timestamp"
                    ]
                },
            },
            "@properties": {
                "is_open": {
                    "type": "boolean"
                },
                "on": {
                    "type": "boolean",
                    "writeable": true
                },
                "temperature": {
                    "type": "numeric"
                }
            },
            "@actions": {
                "unlock": null,
                "lock": null
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

things.push({ name: 'door33', id: 3 });


// all databases returns the data asynchronously so return from this local file asynchronously as well 
// to keep the implementation consistent
exports.things_list = function things_list( callback) {
    callback(null, things);
}


var endpoints = {};

exports.register_endpoint = function register_endpoint(thing, endpoint, callback) {
    if (endpoints[thing] == undefined) {
        endpoints[thing] = [];
    }
    
    var endpointlist = endpoints[thing];
    
    // check if the endpoint for the thing is registered already
    for (i = 0; i < endpointlist.length; i++) {
        if (endpointlist[i] == endpoint) {
            //  this endpoint already registered
            return callback(null, true);
        }
    }

    endpointlist.push(endpoint);

    callback(null, true);
}


exports.endpoint_list = function register_endpoint(thing, callback) {
    callback(null, endpoints[thing]);
}