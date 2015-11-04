/**
* @module kad/message
*/

'use strict';

var assert = require('assert');
var constants = require('./constants');
var merge = require('merge');
var Contact = require('./contact');

/**
* Represents a message to be sent over RPC
* @constructor
* @param {string} type
* @param {object} params
* @param {object} fromContact
*/
function Message(type, params, fromContact) {
  if (!(this instanceof Message)) {
    return new Message(type, params, fromContact);
  }

  assert(constants.MESSAGE_TYPES.indexOf(type) !== -1, 'Invalid message type');
  assert(fromContact instanceof Contact, 'Invalid contact supplied');

  this.type = type;
  this.params = merge(params, fromContact);
}

/**
* Serialize message to a Buffer
* #serialize
*/
Message.prototype.serialize = function() {
  return new Buffer(JSON.stringify(this), 'utf8');
};

module.exports = Message;
