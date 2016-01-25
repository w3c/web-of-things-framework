var assert = require('assert');
var logger = require('../../logger');
var wotkad = require('../../libs/transport/p2p/wotkad/kaddht');   //WOT Kademlia DHT object
var WoTMessage = require('../../libs/message/wotmsg');


var list_of_seeds = [];
//  TODO use persistent store Redis or Levelup for the public key list
var contacts = {};

exports.seed_nodes = list_of_seeds;

exports.start = function start(settings) {
    try {
        logger.info('Bootstrap P2P network, initiate seed node');
        
        if (!settings || !settings.nodes || !settings.nodes.length) {
            throw new Error("Invalid P2P configuration settings");
        }
        
        // start the P2P overlay networks and Kademlia DHT by adding the first 2 peer nodes       
        for (var i = 0; i < settings.nodes.length; i++) {
            var node = settings.nodes[i];
            assert(node.address, 'No p2p address is specified');
            assert(node.port, 'No p2p port is specified');
            assert(node.nick, 'No p2p nick is specified');
            
            //  Create our first nodea
            //  this seed nodea will never send a message and therefore
            //  the public key is not required to verify its signature
            //var seed_node = peernet.create_peer({
            //    address: node.address,
            //    port: node.port,
            //    nick: node.nick,
            //    seeds: node.seeds
            //});    
            var peernode = wotkad({
                address: node.address,
                port: node.port,
                nick: node.nick,        
                seeds: node.seeds
            });
            list_of_seeds.push(peernode);
        }

        logger.info('P2P overlay network started');
    }
    catch (err) {
        logger.error("P2P handler start error %j", err, {});
    }
}

function update_contact(nick, callback) {
    var node = list_of_seeds[0];
    node.get(nick, function (err, msg) {
        try {
            if (err) {
                //logger.error("get_public_key error %j", err, {});
                return callback(err);
            }
            
            // parse the message
            var wotmsg = new WoTMessage();
            var payload = wotmsg.get_message_payload(msg);
            if (payload && payload.data && payload.data.type && payload.data.type == wotmsg.MSGTYPE.ADDPK 
                && payload.data[wotmsg.MSGFIELD.PUBKEY] != null && payload.data[wotmsg.MSGFIELD.ECDHPK] != null) {
                //  this message is actually trying to add the public key to the network first time
                //  validate the message and let add the public key
                var decoded = wotmsg.decode(msg, payload.data[wotmsg.MSGFIELD.PUBKEY]);
                if (decoded && decoded.data[wotmsg.MSGFIELD.PUBKEY]) {
                    var pkey = decoded.data[wotmsg.MSGFIELD.PUBKEY];
                    var ecdhpk = decoded.data[wotmsg.MSGFIELD.ECDHPK];
                    var address = decoded.data[wotmsg.MSGFIELD.HOST];
                    var port = decoded.data[wotmsg.MSGFIELD.PORT];
                    var contact = { public_key: pkey, ecdh_public: ecdhpk, address: address, port: port }
                    contacts[nick] = contact;
                    return callback(null, contact);
                }
            }
        }
        catch (e) {
            logger.error("get_contact exception %j", e, {});
            callback("get_contact error " + e.message);
        }
    });   
}

exports.get_public_key = function (nick, callback) {
    var pkey = contacts[nick].public_key;
    if (pkey) {
        return callback(null, pkey );
    }
    
    update_contact(nick, function (err) {
        if (err) {         
            return callback(err);
        }
        pkey = contacts[nick].public_key;
        if (pkey) {
            return callback(null, pkey);
        }
    });
}

exports.get_ecdh_pkey = function (nick, callback) {
    var ecdhpk = contacts[nick].ecdh_public;
    if (ecdhpk) {
        return callback(null, ecdhpk);
    }
    
    update_contact(nick, function (err) {
        if (err) {
            return callback(err);
        }
        ecdhpk = contacts[nick].ecdh_public;
        if (ecdhpk) {
            return callback(null, ecdhpk);
        }
    });
}

exports.get_contact = function (nick, callback) {
    var contact = contacts[nick];
    if (contact) {
        return callback(null, contact);
    }
    
    update_contact(nick, function (err) {
        if (err) {
            return callback(err);
        }
        contact = contacts[nick];
        if (contact) {
            return callback(null, contact);
        }
    });
}


exports.get_public_key_sync = function (nick) {
    return contacts[nick] && contacts[nick].public_key ? contacts[nick].public_key : null;
}