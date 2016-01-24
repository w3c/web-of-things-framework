
'use strict';

var inherits = require('util').inherits;
var clarinet = require('clarinet');
var net = require('net');
var AddressPortContact = require('./address-port-contact');
var Message = require('../message');
var RPC = require('../rpc');
var utils = require('../utils');

inherits(TCPTransport, RPC);

/**
* Represents an RPC interface over TCP
* @constructor
* @param {object} options
*/
function TCPTransport(options) {
    if (!(this instanceof TCPTransport)) {
        return new TCPTransport(options);
    }

    var self = this;

    RPC.call(this, options);

    this._socket = net.createServer(this._handleConnection.bind(this));

    this._socket.on('error', function(err) {
        var contact = self._contact;
        self._log.error('failed to bind to supplied address %s', contact.address);
        self._log.error('error %j', err);
        self._log.info('binding to all interfaces as a fallback');
        self._socket.close();

        self._socket = net.createServer(self._handleConnection.bind(self));

        self._socket.listen(contact.port);
    });

    this._socket.on('listening', function () {
        var address = self._socket.address();
        self._log.info("opened server on %j", address);
        self.emit('ready');
    });

    this._socket.listen(this._contact.port); //, this._contact.address);
}

/**
* Create a TCP Contact
* #_createContact
* @param {object} options
*/
TCPTransport.prototype._createContact = function(options) {
    return new AddressPortContact(options);
};

/**
* Send a RPC to the given contact
* #_send
* @param {buffer} data
* @param {Contact} contact
*/
TCPTransport.prototype._send = function (data, contact) {   
    var self = this;
    var sock = net.createConnection(contact.port, contact.address);

    sock.on('error', function (err) {
        self.emit("NODE_ERROR", err, contact, data);
        self._log.error('TCPTransport send error connecting to peer. err: %j', err);        
    });

    sock.end(data);
};

/**
* Close the underlying socket
* #_close
*/
TCPTransport.prototype._close = function() {
    this._socket.close();
};

TCPTransport.prototype.report_fault_msg = function (address, port) {
    
};


/**
* Handle incoming connection
* #_handleConnection
* @param {object} socket
*/
TCPTransport.prototype._handleConnection = function (socket) {

    var self = this;

    var addr = socket.remoteAddress;
    var port = socket.remotePort;
    var parser = clarinet.createStream();
    var buffer = '';
    var opened = 0;
    var closed = 0;

    //this._log.info('connection opened with %s:%s', addr, port);

    parser.on('openobject', function(key) {
        opened++;
    });

    parser.on('closeobject', function() {
        closed++;

        if (opened === closed) {
            var msgobj = null;
            try {
                msgobj = JSON.parse(buffer);
            }
            catch (e) {
                //  TODO check the sender for DDoS and other issues
                buffer = '';
                opened = 0;
                closed = 0;
                return self.report_fault_msg(addr, port);
            }
            
            try {
                if (msgobj && msgobj.type) {
                    switch (msgobj.type) {
                        case "DISCOVERY":
                            self._log.debug('DISCOVERY message');
                            var reply = JSON.stringify({ address: addr });
                            socket.write(reply);
                            break;
                        
                        case "PEERMSG":
                            self.emit('PEERMSG', msgobj, { address: addr, port: port });
                            break;
                        
                        case "MSGREQUEST":
                            var account = msgobj.account;
                            self.emit('MSGREQUEST', account, function (err, count, msgs) {
                                var reply = "";
                                if (err) {
                                    reply = JSON.stringify({ error: err });
                                }
                                else {
                                    reply = JSON.stringify({ error: 0, count: count, messages: msgs });
                                }
                                socket.write(reply);
                            });
                            break;

                        case "DELMSGS":
                            var request = msgobj.request;
                            self.emit('DELMSGS', request, function (err) {
                                var reply = JSON.stringify({ result: err || 0});
                                socket.write(reply);
                            });
                            break;

                        default:
                            self._handleMessage(Buffer(buffer), { address: addr, port: port });
                            break
                    }
                }
            }
            catch (e) {
                self._log.error('TCP process message object error: %j', e);
            }

            buffer = '';
            opened = 0;
            closed = 0;
        }
    });

    parser.on('error', function (err) {
        try {
            self._log.error('parser error: %j', err);
            socket.close();
        }
        catch (err) { }
    });

    socket.on('error', function (err) {
        var clientaddr = addr + ":" + port;
        self._log.error('error communicating with peer %s error: %j', clientaddr, err);
    });

    socket.on('data', function(data) {
        buffer += data.toString('utf8');
        //self._log.debug('buffer: ' + buffer);
        parser.write(data.toString('utf8'));
    });

    socket.on('end', function () {
        //self._log.debug('client socket disconnected');
    });
};

module.exports = TCPTransport;
