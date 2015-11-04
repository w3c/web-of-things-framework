/**
* @module kad/contact
*/

'use strict';

var assert = require('assert');
var utils = require('./utils');

/**
* Represent a contact (or peer)
* @constructor
* @param {object} options
*/
function Contact(options) {

  assert(this instanceof Contact, 'Invalid instance was supplied');
  assert(options instanceof Object, 'Invalid options were supplied');

  Object.defineProperty(this, 'nodeID', {
    value: options.nodeID || this._createNodeID(),
    configurable: false,
    enumerable: true
  });

  assert(utils.isValidKey(this.nodeID), 'Invalid nodeID was supplied');

  this.seen();
}

/**
* Updates the lastSeen property to right now
* #seen
*/
Contact.prototype.seen = function() {
  this.lastSeen = Date.now();
};

/* istanbul ignore next */
/**
* Unimplemented stub, called when no nodeID is passed to constructor.
* #_createNodeID
*/
Contact.prototype._createNodeID = function() {
  throw new Error('Method not implemented');
};

module.exports = Contact;
