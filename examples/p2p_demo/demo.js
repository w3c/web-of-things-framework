// set this global config variable first
global.appconfig = require('./config');

var crypto = require('crypto') 
var events = require("events");
var logger = require('../../logger');
var db = require('../../data/db')();
var wot = require('../../framework');
var uuid = require('uuid');
var PeerNetwork = require('../../libs/transport/p2p/wotkad/peer_network');
var simulator = require('./simulator');
var config = global.appconfig;

var peernet = new PeerNetwork();

var device = function (thing_name) {

    var self = this;
    this.name = thing_name;
    
    self.property_get = function (property, callback) {
        logger.debug("get property from the P2P network: " + property);
        
        if (!this.node) {
            return callback("peer node is not initialised");
        }

        var key = thing_name + "/property/" + property;
        this.node.get(key, callback);        
    }
    
    
    self.setProperty = function (property, value) {
        logger.debug("send patch to device: " + property + ", value " + value);
        var key = thing_name + "/patch/" + property;

        // TODO
    }
    
    self.action = function (action) {
        logger.debug("invoke action " + action + " at device simulator");
        var key = thing_name + "/action/" + action;

        // TODO
    }
    
    self.is_msg_fordevice = function (keymsg) {
        var elements = keymsg.split("/");
        if (elements&& elements[0] == this.name ) {
            return {result: true, type: elements[1], value: elements[2] };
        }
        
        return false;       
    }
    
    // create the P2P peer node
    self.init = function ( model, address, port, callback) {
        this.model = model;
        
        var seedaddr = config.servers.p2p.nodes[0].address;
        var seedport = config.servers.p2p.nodes[0].port;
        options = {
            address: address,
            port: port,
            nick: uuid.v4(),
            alg: {}, 
            private_key: {},
            public_key: {},
            seeds: [{ address: seedaddr, port: seedport }]
        };
        this.node = peernet.create_peer(options);
        
        this.node.on('connect', function (err, value) {
            if (err) {
                return logger.error("peer connect error %j", err, {});
            }
            
            logger.debug("peer " + self.name + " %j connected to overlay network", value, {});
            
            peernet.on('data', function (key) {
                var keyres = self.is_msg_fordevice(key);
                if (keyres && keyres.result == true) {
                    self.node.get(key, function (err, value) {
                        if (err) {
                            return logger.error("peer get error %j", err, {});
                        }

                        logger.debug(self.name + ' P2P update type: ' + keyres.type + ', ' + keyres.value + ' value is : ' + value);
                    });
                }
            });
    
        });

        callback();
    }
    
    self.unbind = function (callback) {
        //  TODO remove the node from the overlay network
        callback();
    }

    return self;    
};

//
//  The implementations of the things  
//

var toyota_car = new device("Toyota");
var ford_car = new device("Ford");

var things = [
    {
        "thing": function (callback) {
            db.find_thing("Toyota", callback);
        },
        "implementation": {
            start: function (thing) {               
                toyota_car.init(thing.model, '127.0.0.1', 65520, function (err) {
                    if (err) {
                        return logger.error("P2P thing Toyota initialisation error: " + err);
                    }
                });
            },
            stop: function (thing) {
                toyota_car.unbind(function (err) {
                    if (err) {
                        return logger.error("P2P thing Toyota unbind error: " + err);
                    }
                });
            },
            property_get: function (property, callback) {
                toyota_car.property_get(property, function (err, value) {
                    if (err) {
                        callback(err);
                        return logger.error("P2P thing Toyota " + property + " property_get error: " + err);
                    }
                    
                    logger.debug('peer Toyota thing received key: ' + key + ' value: ' + value);

                    callback(null, value);   
                });
            }
        }
    },
    {
        "thing": function (callback) {
            db.find_thing("Ford", callback);
        },
        "implementation": {
            start: function (thing) {
                ford_car.init(thing.model, '127.0.0.1', 65521, function (err) {
                    if (err) {
                        return logger.error("P2P thing Ford initialisation error: " + err);
                    }
                });
            },
            stop: function (thing) {
                ford_car.unbind(function (err) {
                    if (err) {
                        return logger.error("P2P thing Ford unbind error: " + err);
                    }
                });
            },
            property_get: function (property, callback) {
                ford_car.property_get(property, function (err, value) {
                    if (err) {
                        callback(err);
                        return logger.error("P2P thing Ford " + property + " property_get error: " + err);
                    }
                    
                    logger.debug('peer Ford thing received key: ' + key + ' value: ' + value);
                    
                    callback(null, value);
                });
            }
        }
    }        
];

// call the framework initialisation method and pass an array of things definitions to the framework
// for this demo the things are defined here
try {
    logger.debug("Initialising framework");
    wot.transport_init();
    wot.things_init(things);
    // start the device device simulator
    simulator.start();
}
catch (e) {
    logger.error("Error in initialising framework " + e.message);
}

