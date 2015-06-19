
var url = require('url');

function ChannelFactory() {
    var self = this;
    self._map = {};
}

ChannelFactory.prototype.register = function(protocol, factory) {
    var self = this;

    console.log("Registering protocol: " + protocol);

    self._map[protocol] = factory;
}

ChannelFactory.prototype.get = function(uri, succeed, fail) {
    var self = this;

    var parsed = url.parse(uri);

    if (self._map.hasOwnProperty(parsed.protocol)) {
        self._map[parsed.protocol].create(uri, succeed, fail);
    } else {
        fail("No protocol handler registered for: " + "URI: " + uri);
    }
}

module.exports = new ChannelFactory();