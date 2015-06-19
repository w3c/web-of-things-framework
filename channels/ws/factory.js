
var Channel = require('../channel.js');
var WebSocketChannel = require('./ws.js');
var util = require('util');

function WebSocketChannelFactory() {
    var self = this;
    self._protocol = "ws:";

    Channel.call(self, self._protocol);
}

util.inherits(WebSocketChannelFactory, Channel);

WebSocketChannelFactory.prototype.create = function(uri, succeed, fail) {
    try {
        succeed(new WebSocketChannel(uri));
    } catch (e) {
        console.log("create: " + e);
        fail(e);
    }
}

WebSocketChannelFactory.prototype.protocol = function() {
    var self = this;
    return self._protocol;
}

module.exports = WebSocketChannelFactory;