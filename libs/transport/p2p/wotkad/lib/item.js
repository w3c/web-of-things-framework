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

var assert = require('assert');
var constants = require('./constants');
var utils = require('./utils');
var crypto = require('crypto');

/**
* Represents an item to store
* @constructor
* @param {string} key
* @param {object} value
* @param {string} publisher - nodeID
* @param {number} timestamp - optional
*/
function Item(key, value, publisher, timestamp, recipient) {
    if (!(this instanceof Item)) {
        return new Item(key, value, publisher, timestamp, recipient);
    }

    assert.ok(typeof key === 'string', 'Invalid key supplied');
    assert.ok(value, 'Invalid value supplied');
    assert(utils.isValidKey(publisher), 'Invalid publisher nodeID supplied');

    if (timestamp) {
        assert(typeof timestamp === 'number', 'Invalid timestamp supplied');
        assert(Date.now() >= timestamp, 'Timestamp cannot be in the future');
    }
    
    var obj = [key, value];
    var str = JSON.stringify(obj);
    var buffer = new Buffer(str);
    var hashval = crypto.createHash('sha1').update(buffer).digest();
    this.hash = hashval.toString('hex');

    this.key = key;
    this.value = value;
    this.publisher = publisher;
    this.timestamp = timestamp || Date.now();
    this.recipient = recipient || "";
}

module.exports = Item;
