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

util.inherits(PeerNetwork, events.EventEmitter);

function PeerNetwork() {
    if (!(this instanceof PeerNetwork)) {
        return new PeerNetwork();
    }

    events.EventEmitter.call(this);
    
    this.stored_items = {}; 
}

PeerNetwork.prototype.create_peer = function (options) {
    var self = this;

    assert(options.address, 'No address supplied');
    assert(options.port, 'No port supplied');
    assert(options.nick, 'No nick supplied');
    assert(options.alg, 'No acryptography algorithm supplied');
    assert(options.private_key, 'No private key supplied');
    assert(options.public_key, 'No private key supplied');
    
    var peernode = wotkad({
        address: options.address,
        port: options.port,
        nick: options.nick,
        alg: options.alg,
        private_key: options.private_key,
        public_key: options.public_key,
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


PeerNetwork.prototype.validate_keyvaluepair = function (key, value, callback) {
    callback(true);
}


module.exports = PeerNetwork;