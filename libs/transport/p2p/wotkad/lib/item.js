/**
* @module kad/item
*/

'use strict';

var assert = require('assert');
var constants = require('./constants');
var utils = require('./utils');

/**
* Represents an item to store
* @constructor
* @param {string} key
* @param {object} value
* @param {string} publisher - nodeID
* @param {number} timestamp - optional
*/
function Item(key, value, publisher, timestamp) {
  if (!(this instanceof Item)) {
    return new Item(key, value, publisher, timestamp);
  }

  assert.ok(typeof key === 'string', 'Invalid key supplied');
  assert.ok(value, 'Invalid value supplied');
  assert(utils.isValidKey(publisher), 'Invalid publisher nodeID supplied');

  if (timestamp) {
    assert(typeof timestamp === 'number', 'Invalid timestamp supplied');
    assert(Date.now() >= timestamp, 'Timestamp cannot be in the future');
  }

  this.key = key;
  this.value = value;
  this.publisher = publisher;
  this.timestamp = timestamp || Date.now();
}

module.exports = Item;
