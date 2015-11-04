/**
* @module kad/transports/udp
*/

'use strict';

var AddressPortContact = require('./address-port-contact');
var inherits = require('util').inherits;
var dgram = require('dgram');
var RPC = require('../rpc');

inherits(UDPTransport, RPC);

/**
* Represents an UDP transport for RPC
* @constructor
* @param {object} options
*/
function UDPTransport(options) {
  if (!(this instanceof UDPTransport)) {
    return new UDPTransport(options);
  }

  var self = this;
  var socketOptions = { type: 'udp4', reuseAddr: true };
  var socketMessageHandler = this._handleMessage.bind(this);

  RPC.call(this, options);

  this._socket = dgram.createSocket(socketOptions, socketMessageHandler);

  this._socket.on('error', function(err) {
    var contact = self._contact;
    self._log.warn('failed to bind to supplied address %s', contact.address);
    self._log.info('binding to all interfaces as a fallback');
    self._socket.close();

    self._socket = dgram.createSocket(socketOptions, socketMessageHandler);

    self._socket.bind(contact.port);
  });

  this._socket.on('listening', function() {
    self.emit('ready');
  });

  this._socket.bind(this._contact.port, this._contact.address);
}

/**
* Create a UDP Contact
* #_createContact
* @param {object} options
*/
UDPTransport.prototype._createContact = function(options) {
  return new AddressPortContact(options);
}

/**
* Send a RPC to the given contact
* #_send
* @param {buffer} data
* @param {Contact} contact
*/
UDPTransport.prototype._send = function(data, contact) {
  this._socket.send(data, 0, data.length, contact.port, contact.address);
};

/**
* Close the underlying socket
* #_close
*/
UDPTransport.prototype._close = function() {
  this._socket.close();
};

module.exports = UDPTransport;
