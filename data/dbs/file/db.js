
// The main things definition for the server
// The WoT server will manage these things
var definitions = [];

definitions.push(
    {
        "name": "door12",    
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
        },
        "remote": {
            "uri": "http://localhost:8890"
        }
    }
);


definitions.push(
    {
        "name": "Toyota",    
        "model": {
            "@events": {
                "door_open": {
                    "type": "object",
                    "fields": {
                        "timestamp": {
                            "description": "The time of event", 
                            "type": "numeric"
                        }, 
                    }
                },
            },
            "@properties": {
                "speed": {
                    "type": "object",
                    "fields": {
                        "unit": {
                            "description": "The unit identifier in KmH or MpH", 
                            "type": "string"
                        }, 
                        "value": {
                            "description": "The speed value", 
                            "type": "numeric"
                        }
                    }
                },
                "location": {
                    "type": "object",
                    "fields": {
                        "latitude": {
                            "description": "The latitude part of the location", 
                            "type": "string"
                        }, 
                        "longitude": {
                            "description": "The longitude part of the location", 
                            "type": "numeric"
                        }
                    }
                }
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
        "name": "Ford",    
        "model": {
            "@events": {
                "door_open": {
                    "type": "object",
                    "fields": {
                        "timestamp": {
                            "description": "The time of event", 
                            "type": "numeric"
                        }, 
                    }
                },
            },
            "@properties": {
                "speed": {
                    "type": "object",
                    "fields": {
                        "unit": {
                            "description": "The unit identifier in KmH or MpH", 
                            "type": "string"
                        }, 
                        "value": {
                            "description": "The speed value", 
                            "type": "numeric"
                        }
                    }
                },
                "location": {
                    "type": "object",
                    "fields": {
                        "latitude": {
                            "description": "The latitude part of the location", 
                            "type": "string"
                        }, 
                        "longitude": {
                            "description": "The longitude part of the location", 
                            "type": "numeric"
                        }
                    }
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

// for demo and test reasons use global variables to define which resources are exposed to the clients
if (global.is_door12_defined) {
    things.push({ name: 'door12', id: 1 });
}

if (global.is_switch12_defined) {
    things.push({ name: 'switch12', id: 2 });
}

if (global.is_door33_defined) {
    things.push({ name: 'door33', id: 3 });
}


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

var adapters = [];

adapters.push(
    {
        "device": "door12",  
        "protocol": "coap",
        "host": "localhost",
        "port": 5685
    },
    {
        "device": "switch12",  
        "protocol": "coap",
        "host": "localhost",
        "port": 5686
    },
    {
        "device": "door33",  
        "protocol": "coap",
        "host": "localhost",
        "port": 5687
    },
    {
        "device": "door12",  
        "protocol": "http", // http or https
        "host": "localhost",
        "port": 8890
    },
    {
        "device": "switch12",  
        "protocol": "http", // http or https
        "host": "localhost",
        "port": 8891
    },
    {
        "device": "door33",  
        "protocol": "http", // http or https
        "host": "localhost",
        "port": 8892
    }
);


exports.find_adapter = function find_adapter(device, protocol, callback) {
    var adapter = null;
    for (i = 0; i < adapters.length; i++) {
        if (adapters[i].device == device && adapters[i].protocol == protocol) {
            adapter = adapters[i];
            break;
        }
    }
    
    if (!adapter) {
        return callback("adapter for " + device + ", protocol " + protocol + " doesn't exists in the database");
    }
    
    //  return the name, protocol and model
    callback(null, adapter);
}