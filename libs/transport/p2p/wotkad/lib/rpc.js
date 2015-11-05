/**
* @module kad/rpc
*/

'use strict';

var inherits = require('util').inherits;
var events = require('events');
var assert = require('assert');
var dgram = require('dgram');
var hat = require('hat');
var merge = require('merge');
var constants = require('./constants');
var Contact = require('./contact');
var Message = require('./message');
var logger = require('../../../../../logger');

inherits(RPC, events.EventEmitter);

/**
* Represents an RPC interface
* @constructor
* @param {object} options
*/
function RPC(options) {

  assert(this instanceof RPC, 'Invalid instance supplied');

  var self = this;

  events.EventEmitter.call(this);

  this._createMessageID = hat.rack(constants.B);
  this._pendingCalls = {};
  this._contact = this._createContact(options);
  this._log = logger;

  setInterval(this._expireCalls.bind(this), constants.T_RESPONSETIMEOUT + 5);
}

/**
* Send a RPC to the given contact
* #send
* @param {object} contact
* @param {object} message
* @param {function} callback
*/
RPC.prototype.send = function(contact, message, callback) {
  assert(contact instanceof Contact, 'Invalid contact supplied');
  assert(message instanceof Message, 'Invalid message supplied');

  merge(message.params, {
    rpcID: this._createMessageID()
  });

  var data = message.serialize();
  var offset = 0;

  this._send(data, contact);

  if (typeof callback === 'function') {
    this._pendingCalls[message.params.rpcID] = {
      timestamp: Date.now(),
      callback: callback
    };
  }
};

/**
* Close the underlying socket
* #close
*/
RPC.prototype.close = function() {
  this._close();
};

/**
* Handle incoming messages
* #_handleMessage
* @param {buffer} buffer
* @param {object} info
*/
RPC.prototype._handleMessage = function(buffer, info) {
    var message;
    var data;
    var params;
    var contact;

    try {
        data = JSON.parse(buffer.toString('utf8'));
        params = data.params;
        contact = this._createContact(params);
        message = new Message(data.type, params, contact);

        //this._log.debug('received valid message %j', message, {}); 
    } 
    catch (err) {
        return this.emit('MESSAGE_DROP', buffer, info);
    }

    var referenceID = message.params.referenceID;
    var pendingCall = this._pendingCalls[referenceID];

    if (referenceID && pendingCall) {
        pendingCall.callback(null, message.params);
        delete this._pendingCalls[referenceID];
    } 
    else {
        this.emit('CONTACT_SEEN', contact);
        
        //this._log.debug('emit message %s', message.type); 
        this.emit(message.type, message.params);
    }
};

/**
* Expire RPCs that have not received a reply
* #_expireCalls
*/
RPC.prototype._expireCalls = function() {
  for (var rpcID in this._pendingCalls) {
    var pendingCall = this._pendingCalls[rpcID];
    var timePassed = Date.now() - pendingCall.timestamp;

    if (timePassed > constants.T_RESPONSETIMEOUT) {
      pendingCall.callback(new Error('RPC with ID `' + rpcID + '` timed out'));
      delete this._pendingCalls[rpcID];
    }
  }
};

/* istanbul ignore next */
/**
* Unimplemented stub, called on close()
* #_close
*/
RPC.prototype._close = function() {
  throw new Error('Method not implemented');
};

/* istanbul ignore next */
/**
* Unimplemented stub, called on send()
* #_send
* @param {buffer} data
* @param {Contact} contact
*/
RPC.prototype._send = function(data, contact) {
  throw new Error('Method not implemented');
};

/* istanbul ignore next */
/**
* Unimplemented stub, called in RPC()
* #_createContact
* @param {object} options
*/
RPC.prototype._createContact = function(options) {
  throw new Error('Method not implemented');
};

module.exports = RPC;
