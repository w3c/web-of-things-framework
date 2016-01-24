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
var utils = require('./utils');

/**
* Represent a contact (or peer)
* @constructor
* @param {object} options
*/
function Contact(options) {

    assert(this instanceof Contact, 'Invalid instance was supplied');
    assert(typeof options == "object", 'Invalid options were supplied');

    Object.defineProperty(
        this, 
        'nodeID', {
            value: options.nodeID || this._createNodeID(),
            configurable: false,
            enumerable: true
        }
    );

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
