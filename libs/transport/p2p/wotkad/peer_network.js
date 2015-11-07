/*
 
This file is part of W3C Web-of-Things-Framework.

W3C Web-of-Things-Framework is an open source project to create an Internet of Things framework.
This program is free software: you can redistribute it and/or modify it under the terms of the GNU General Public License as published by 
the Free Software Foundation, either version 3 of the License, or (at your option) any later version.

W3C Web-of-Things-Framework is distributed in the hope that it will be useful, but WITHOUT ANY WARRANTY; without even the implied warranty of 
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the GNU General Public License for more details.

You should have received a copy of the GNU General Public License along with W3C Web-of-Things-Framework.  If not, see <http://www.gnu.org/licenses/>.
 
File created by Tibor Zsolt Pardi

Copyright (C) 2015 The W3C WoT Team
 
*/

var util = require("util");
var events = require("events");
var assert = require('assert');
var async = require('async');
var wotkad = require('./kaddht');   //WOT Kademlia DHT object
var logger = require('../../../../logger');
var WoTMessage = require('../../../../libs/message/wotmsg');
var p2phandler = require('../../../../transports/p2p/handler');

util.inherits(PeerNetwork, events.EventEmitter);

function PeerNetwork() {
    if (!(this instanceof PeerNetwork)) {
        return new PeerNetwork();
    }

    events.EventEmitter.call(this);
    
    //  TODO this should be in persistent store such as Redis or Levelup
    this.stored_items = {};
}

PeerNetwork.prototype.create_peer = function (options) {
    var self = this;

    assert(options.address, 'No address supplied');
    assert(options.port, 'No port supplied');
    assert(options.nick, 'No nick supplied');

    var peernode = wotkad({
        address: options.address,
        port: options.port,
        nick: options.nick,        
        seeds: options.seeds,
        validateKeyValuePair: this.validate_keyvaluepair
    });
    
    peernode.on('store', this.msg_stored.bind(this));
    
    return peernode;  
}


PeerNetwork.prototype.msg_stored = function (node_id, item) {
    if (!item || !item.key || !item.hash)
        return;

    var hash = item.hash;
    var key = item.key;
    var stored = this.stored_items[key];
    if (stored == hash) {
        return;
    }

    this.stored_items[key] = hash;
    this.emit("data", key);
}


//PeerNetwork.prototype.get_public_key = function (key, msg, callback) {
//    var elements = key.split("/");
//    var nick = elements[0];
//    p2phandler.get_public_key(nick, function (err, pkey) {
//        if (err) {
//            // not exists ?
//            if (key.indexOf("/") > -1) {
//                return callback(err);
//            }

//            var wotmsg = new WoTMessage();
//            pkey = WoTMessage.get_message_payload(msg);
//        }
//    });

//    var elements = key.split("/");
//    var nick = elements[0];
//    var pkey = this.public_keys[nick];
//    if (pkey) {
//        return callback(null, pkey);
//    }

//    //  try to get the public key from the message
//    if (key.indexOf("/") == -1) {
//        var wotmsg = new WoTMessage();
//        pkey = WoTMessage.get_public_key(msg);
//    }
//}


PeerNetwork.prototype.validate_keyvaluepair = function (key, msg, callback) {
    try {
        
        var is_pkeyadd_message = function (message) {
            var result = false;
            try {
                var wotmsg = new WoTMessage();
                var payload = wotmsg.get_message_payload(message);
                result = payload && payload.data && payload.data.type && payload.data.type == wotmsg.MSGTYPE.ADDPK && payload.data[wotmsg.MSGFIELD.PUBKEY] != null;
            }
            catch (err) {
                logger.error("PeerNetwork validate_keyvaluepair is_pkeyadd_message error: %j", err, {});
            }
            return result;
        };

        var validate_msg = function (message, public_key) {
            try {
                var wotmsg = new WoTMessage();
                var decoded = wotmsg.decode(message, public_key);
                if (decoded) {
                    return true;
                }
            }
            catch (err) {
                logger.error("PeerNetwork validate_keyvaluepair validate message error: %j", err, {});
            }
            return false;
        };
        
        var elements = key.split("/");
        var nick = elements[0];
        // try to get the public key forst from the local repository
        var public_key = p2phandler.get_public_key_sync(nick);
        if (public_key) {
            var is_valid = validate_msg(msg, public_key);
            return callback(is_valid);
        }
        else {
            p2phandler.get_public_key(nick, function (err, pkey) {
                if (err) {
                    // not exists ?
                    if (key.indexOf("/") > -1) {
                        logger.error("PeerNetwork validate_keyvaluepair failed to get public key error: %j", err, {});
                        return callback(false);
                    }
                    
                    if (is_pkeyadd_message(msg)) {
                        return callback(true);
                    }
                    else {
                        logger.error("PeerNetwork validate_keyvaluepair failed to get public key");
                        return callback(false);
                    }
                }
                else {
                    var is_valid = validate_msg(msg, pkey);
                    return callback(is_valid);
                }
            });
        }
    }
    catch (err) {
        logger.error("PeerNetwork validate_keyvaluepair error %j", err, {});
        callback(false);
    }
    //callback(true);
}


module.exports = PeerNetwork;