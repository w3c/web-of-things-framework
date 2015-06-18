
var util = require('util');
var EventEmitter = require('events').EventEmitter;

function Channel(uri) {
    var self = this;

    if (self.constructor === Channel) {
        throw new Error('Channel is an abstract class');
    }

    EventEmitter.call(self);

    self._uri = uri;
}

util.inherits(Channel, EventEmitter);

Channel.prototype.uri = function() {
    return self._uri;
}

Channel.prototype.connect = function(uri, succeed, fail) {
    var self = this;

    if (self.constructor === Channel) {
        throw new Error('Channel::connect is an abstract method');
    }
}

Channel.prototype.send = function(message) {
    var self = this;

    if (self.constructor === Channel) {
        throw new Error('Channel::send is an abstract method');
    }
}

Channel.prototype.messages = {
    open: "open",
    close: "close",
    action: "action",
    patch: "patch",
    proxy: "proxy",
    uri: "uri",
    error: "error"
}

module.exports = Channel;