
var Channel = require('../channel.js');
var util = require('util');
var WebSocket = require('ws');

function WebSocketChannel(uri, existingSocket) {
    var self = this;

    Channel.call(self, uri);

    if (existingSocket) {
        self._ws = existingSocket;
    } else {
        self._ws = new WebSocket(uri);
    }

    self.normalize_message = function(message) {
        return message;
    }
}

util.inherits(WebSocketChannel, Channel);

WebSocketChannel.prototype.connect = function(succeed, fail) {
    var self = this;

    this.ws.onopen = function() {
        self.emit(self.messages.open, self);
    };

    this.ws.onclose = function() {
        self.emit(self.messages.close, self);
    };

    this.ws.onerror = function() {
        self.emit(self.messages.error, self);
    };

    this.ws.onmessage = function(message) {
        console.log("WS: " + message);
        self.emit(self.messages.message, self, normalize_message(message));
    }

    succeed(self);
}

WebSocketChannel.prototype.send = function(message) {
    this._ws.send(JSON.stringify(message));
}

module.exports = WebSocketChannel;