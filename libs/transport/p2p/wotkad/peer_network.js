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
    
    return peernode;  
}


PeerNetwork.prototype.validate_keyvaluepair = function (key, value, callback) {
    callback(true);
}




module.exports = PeerNetwork;