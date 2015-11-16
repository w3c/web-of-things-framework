// set this global config variable first
global.appconfig = require('./config');
// set the global logger
global.applogger = require('../../logger');

var crypto = require('crypto') 
var events = require("events");
var logger = global.applogger; //require('../../logger');
var db = require('../../data/db')();
var wot = require('../../framework');
var uuid = require('uuid');
var PeerNetwork = require('../../libs/transport/p2p/wotkad/peer_network');
var simulator = require('./simulator');
var p2phandler = require('../../transports/p2p/handler');
var WoTMessage = require('../../libs/message/wotmsg');
var peercomm = require('../../libs/transport/p2p/wotkad/peer_comm');
var crypto = require('crypto')
var secrand = require('secure-random');
var EccKey = require('../../libs/crypto/ecc/EccKey');
var p2phandler = require('../../transports/p2p/handler');


var config = global.appconfig;

var peernet = new PeerNetwork();

var PeerHandler = function (thing_name, client_name) {

    var self = this;
    this.name = thing_name;
    this.nick = client_name;
    
    // generate the cryptography keys
    var random_bytes = secrand.randomBuffer(32);
    var pwd = crypto.createHash('sha1').update(random_bytes).digest().toString('hex');
    this.cryptokey = new EccKey(pwd);
    
    this.ecdh_key = crypto.createECDH('secp256k1');
    this.ecdh_key.generateKeys();
    this.ecdh_public_key = this.ecdh_key.getPublicKey('hex');
    
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
    
    this.peer_msg_handler = function (buffer, info) {
        var id = buffer.readUInt32BE(0);
        var type = buffer.readUInt16BE(4);
        if (id == 0x75115507 && type == 0xDAD) {
            var b = buffer;
        }
    };
    
    this.send_peer_message = function (msg) {
        try {
            p2phandler.get_contact(this.name, function (err, contact) {
                if (err) {
                    return logger.error("send_peer_message error %j", err, {});
                }
                
                try {
                    var wotmsg = new WoTMessage();
                    var encoded_msgbuffer = wotmsg.create_peermsg(self.cryptokey.privateKey, self.ecdh_key, contact[wotmsg.MSGFIELD.ECDHPK], msg, self.nick, self.name);
                    peercomm.sendmsg(encoded_msgbuffer, contact.port, contact.address);
                }
                catch (e) {
                    logger.error("PeerHandler send_peer_message error %j", e, {});
                }
            });
        }
        catch (err) {
            logger.error("PeerHandler send_peer_message error %j", err, {});
        }
    }
    
    // create the P2P peer node
    self.init = function ( model, address, port, callback, datafn) {
        this.model = model;
        
        var seedaddr = config.servers.p2p.nodes[0].address;
        var seedport = config.servers.p2p.nodes[0].port;
        options = {
            address: address,
            port: port,
            nick: this.nick,
            seeds: [{ address: seedaddr, port: seedport }],
            peermsgHandler: this.peer_msg_handler
        };
        this.node = peernet.create_peer(options);
        
        this.node.on('connect', function (err, value) {
            if (err) {
                return logger.error("peer connect error %j", err, {});
            }
            
            //  publish the public keys so this client can communicate with the devices
            //  via direct peer to peer messaging as well
            // create the WoT message 
            var wotmsg = new WoTMessage();
            var payload = { type: wotmsg.MSGTYPE.ADDPK };
            payload[wotmsg.MSGFIELD.PUBKEY] = self.cryptokey.publicKeyStr;
            payload[wotmsg.MSGFIELD.ECDHPK] = self.ecdh_public_key;
            payload[wotmsg.MSGFIELD.HOST] = address;
            payload[wotmsg.MSGFIELD.PORT] = port;
            var jwt_token = wotmsg.create(self.cryptokey.privateKey, payload);
            
            //  For this public key upload message the key is the device name
            self.node.put(self.nick, jwt_token, function (err) {
                if (err) {
                    return logger.error("node put error %j", err, {});
                }
                //  the public key has been uplodad, other peers can verify the messages -> ready to process device messages
                self.is_publickey_uplodaed = true;
            });
            
            logger.debug("peer " + self.name + " %j connected to overlay network", value, {});
            
            peernet.on('data', function (key) {
                var keyres = self.is_msg_fordevice(key);
                if (keyres && keyres.result == true) {
                    self.node.get(key, function (err, value) {
                        if (err) {
                            return logger.error("peer get error %j", err, {});
                        }

                        datafn(key, value);
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

function decode_message(nick, msg) {
    try {
        var pkey = p2phandler.get_public_key_sync(nick)
        if (!pkey) {
            throw new Error("failed to receive public key");   
        }
        var wotmsg = new WoTMessage();
        var payload = wotmsg.decode(msg, pkey);
        if (payload && payload.data) {
            return payload.data;
        }
    }
    catch (err) {
        logger.error("validate_message error: %j", err, {});
    }
    return null;
}

var toyota_car = new PeerHandler("Toyota", "ToyotaClient01");
var ford_car = new PeerHandler("Ford", "FordClient01");

var things = [
    {
        "thing": function (callback) {
            db.find_thing("Toyota", callback);
        },
        "implementation": {
            start: function (thing) {
                toyota_car.init(thing.model, '127.0.0.1', 65520, 
                    function (err) {
                        if (err) {
                            return logger.error("P2P thing Toyota initialisation error: " + err);
                        }

                        //  start a peer message send simulator
                        var peermsgsend = function () {
                            var msg = {data: "message from ToyotaClient01 at " + new Date().toTimeString() }
                            toyota_car.send_peer_message(msg);
                        };
                        setInterval(peermsgsend, 15000);

                    },
                    function (key, msg) {
                        if (key == "Toyota/property/speed") {
                            //  verify and decode the message using the sender public key
                            var data = decode_message("Toyota", msg);
                            if (data) {
                                logger.debug('Toyota P2P update speed: ' + data.value + ' ' + data.unit);                                
                            }
                        }
                    }
                );
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
                ford_car.init(thing.model, '127.0.0.1', 65521, 
                    function (err) {
                        if (err) {
                            return logger.error("P2P thing Ford initialisation error: " + err);
                        }
                    },
                    function (key, msg) {
                        if (key == "Ford/property/speed") {
                            //  verify and decode the message using the sender public key
                            var data = decode_message("Ford", msg);
                            if (data) {
                                logger.debug('Ford P2P update speed: ' + data.value + ' ' + data.unit);
                            }
                        }
                    }
                );
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

