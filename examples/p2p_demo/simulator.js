var logger = require('../../logger');
var PeerNetwork = require('../../libs/transport/p2p/wotkad/peer_network');
var config = global.appconfig;

var peernet = new PeerNetwork();

var device_node = function (thing, address, port) {
    var self = this;
    this.name = thing.name;

    logger.debug("starting P2P device simulator for " + this.name);
    

    
    var seedaddr = config.servers.p2p.nodes[0].address;
    var seedport = config.servers.p2p.nodes[0].port;
    options = {
        address: address,
        port: port,
        nick: this.name,
        alg: {}, 
        private_key: {},
        public_key: {},
        seeds: [{ address: seedaddr, port: seedport }]
    };
    this.node = peernet.create_peer(options);
        
    this.put = function(prop, value) {
        var key = thing.name + prop;
        this.node.put(key, value, function (err) {
            if (err) {
                return logger.error("device_node put error %j", err, {});
            }        
        });
    }
    
    return self;  
}

var toyota_device = {};
var toyota_prop_values = {};
toyota_prop_values["speed"] = 0;
toyota_prop_values["location"] = 0;

var car1 = {
    "name": "Toyota",
    "model": {
        "events": {
            
        },
        // for patch include the writable properties from the data/dbs/file/db.js file
        "properties": {
            "get": function (property) {
                return toyota_prop_values[property];
            },
            "speed": function (value){  
                var setspeedval = function () {
                    var speed = 50;
                    speed += Math.floor(Math.random() * 15);

                    //send to the WoT P2P network
                    toyota_device.put("/property/speed", speed);
                    
                    toyota_prop_values["speed"] = speed;
                };
                setInterval(setspeedval, 5000);
            },
            "location": function () {
            },
        },
        "actions": {
            
        }
    }
};


var ford_device = {};
var ford_prop_values = {};
ford_prop_values["speed"] = 0;
ford_prop_values["location"] = 0;

var car2 = {
    "name": "Ford",
    "model": {
        "events": {
            
        },
        // for patch include the writable properties from the data/dbs/file/db.js file
        "properties": {
            "get": function (property) {
                return ford_prop_values[property];
            },
            "speed": function (value) {
                var setspeedval = function () {
                    var speed = 70;
                    speed += Math.floor(Math.random() * 15);
                    
                    //send to the WoT P2P network
                    ford_device.put("/property/speed", speed);
                    
                    ford_prop_values["speed"] = speed;
                };
                setInterval(setspeedval, 6000);
            },
            "location": function () {
            },
        },
        "actions": {
            
        }
    }
};


exports.start = function start() {
    logger.debug('Start device simulator to communicate with WoT via a P2P network');
    toyota_device = new device_node(car1, 'localhost', 60000);
    car1.model.properties.speed();

    ford_device = new device_node(car2, 'localhost', 60001);
    car2.model.properties.speed();
}
