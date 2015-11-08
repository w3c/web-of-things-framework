var logger = require('../../logger');
var PeerNetwork = require('../../libs/transport/p2p/wotkad/peer_network');
var crypto = require('crypto')
var secrand = require('secure-random');
var EccKey = require('../../libs/crypto/ecc/EccKey');
var WoTMessage = require('../../libs/message/wotmsg');

var config = global.appconfig;

var peernet = new PeerNetwork();

var device_node = function (thing, address, port, seedaddr, seedport) {
    var self = this;
    this.name = thing.name;
    this.is_publickey_uplodaed = false;

    logger.debug("starting P2P device simulator for " + this.name);
    
    this.peer_msg_handler = function (buffer, info) {
        var id = buffer.readUInt32BE(0);
        var type = buffer.readUInt16BE(4);
        if (id == 0x75115507 && type == 0xDAD) {
            var b = buffer;
        }
    };

    options = {
        address: address,
        port: port,
        nick: this.name,
        seeds: [{ address: seedaddr, port: seedport }],
        peermsgHandler: this.peer_msg_handler
    };
    this.node = peernet.create_peer(options);
    
    //  The node must updload its public key to the network so other peers can verify the signed messages
    var random_bytes = secrand.randomBuffer(32);
    var pwd = crypto.createHash('sha1').update(random_bytes).digest().toString('hex');
    this.cryptokey = new EccKey(pwd);

    this.node.on('connect', function (err, value) {
        if (err) {
            return logger.error("peer connect error %j", err, {});
        }
        
        logger.debug("Device peer %s connected to overlay network", self.name, {});
        
        // create the WoT message 
        var wotmsg = new WoTMessage();
        var payload = { type: wotmsg.MSGTYPE.ADDPK };
        payload[wotmsg.MSGFIELD.PUBKEY] = self.cryptokey.publicKeyStr;
        var jwt_token = wotmsg.create(self.cryptokey.privateKey, payload);

        //  For this public key upload message the key is the device name
        self.node.put( self.name, jwt_token, function (err) {
            if (err) {
                return logger.error("onPut error %j", err, {});
            }
            //  the public key has been uplodad, other peers can verify the messages -> ready to process device messages
            self.is_publickey_uplodaed = true;
        });
    });
        
    this.put = function (prop, msg) {
        // create a WoT message
        var wotmsg = new WoTMessage();
        var jwt_token = wotmsg.create(self.cryptokey.privateKey, msg);

        var key = thing.name + prop;
        this.node.put(key, jwt_token, function (err) {
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
                    if (!toyota_device.is_publickey_uplodaed)
                        return;

                    var speed = 50;
                    speed += Math.floor(Math.random() * 15);
                    
                    //send to the WoT P2P network
                    toyota_device.put("/property/speed", { unit: "mph", value: speed });
                    
                    toyota_prop_values["speed"] = { unit: "mph", value: speed };
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
                    if (!ford_device.is_publickey_uplodaed)
                        return;

                    var speed = 70;
                    speed += Math.floor(Math.random() * 15);
                    
                    //send to the WoT P2P network
                    ford_device.put("/property/speed", { unit: "mph", value: speed });
                    
                    ford_prop_values["speed"] = { unit: "mph", value: speed };
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
    
    var seedaddr = config.servers.p2p.nodes[0].address;
    var seedport = config.servers.p2p.nodes[0].port;
    toyota_device = new device_node(car1, 'localhost', 60000, seedaddr, seedport);
    car1.model.properties.speed();
    
    seedaddr = config.servers.p2p.nodes[1].address;
    seedport = config.servers.p2p.nodes[1].port;
    ford_device = new device_node(car2, 'localhost', 60001, seedaddr, seedport);
    car2.model.properties.speed();
}
