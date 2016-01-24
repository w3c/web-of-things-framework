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
        self._log.error('failed to bind to supplied address %s', contact.address);
        self._log.info('binding to all interfaces as a fallback');
        self._socket.close();

        self._socket = dgram.createSocket(socketOptions, socketMessageHandler);

        self._socket.bind(contact.port);
    });

    this._socket.on('listening', function() {
        self.emit('ready');
    });
    
    this._socket.bind(this._contact.port, this._contact.address );
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
