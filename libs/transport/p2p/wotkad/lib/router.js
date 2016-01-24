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

var util = require('util');
var assert = require('assert');
var async = require('async');
var _ = require('lodash');
var constants = require('./constants');
var utils = require('./utils');
var Message = require('./message');
var Contact = require('./contact');
var logger = global.applogger;

/**
* Represents a router for finding nodes and values
* @constructor
* @param {string} type - ['NODE','VALUE']
* @param {string} key - key to find close nodes/value
* @param {object} node - the node executing the route
*/
function Router(type, key, node) {
    if (!(this instanceof Router)) {
        return new Router(type, key, node);
    }

    assert(['NODE', 'VALUE'].indexOf(type) !== -1, 'Invalid search type');

    this.node = node;
    this.type = type;
    this.key = key;
    this.hashedKey = utils.createID(key);

    this.limit = constants.ALPHA;
    this.shortlist = node._getNearestContacts(key, this.limit, node._self.nodeID);

    this.closestNode = this.shortlist[0];
    this.previousClosestNode = null;
    this.contacted = {};
    this.foundValue = false;
    this.value = null;
    this.contactsWithoutValue = [];
}

/**
* Execute this router's find operation with the shortlist
* #route
* @param {function} callback
*/
Router.prototype.route = function(callback) {
    if (!this.closestNode) {
        return callback(new Error('Not connected to any peers'));
    }

    this.closestNodeDistance = utils.getDistance(
        this.hashedKey,
        this.closestNode.nodeID
    );

    this.message = new Message(
        'FIND_' + this.type, 
        {
            key: this.key
        }, 
        this.node._self);

    this._iterativeFind(this.shortlist, callback);
};

/**
* Execute the find operation for this router type
* #iterativeFind
* @param {array} contacts
* @param {function} callback
*/
Router.prototype._iterativeFind = function(contacts, callback) {
    var self = this;

    async.each(contacts, this._queryContact.bind(this), function(err) {
        self._handleQueryResults(callback);
    });
};

/**
* Send this router's RPC message to the contact
* #_queryContact
* @param {object} contactInfo
* @param {function} callback
*/
Router.prototype._queryContact = function(contactInfo, callback) {
    var self = this;
    var contact = this.node._rpc._createContact(contactInfo);
    
    var address = this.node._rpc._contact.address;
    var port = this.node._rpc._contact.port;
    
    if (contact.address == address && contact.port == port) {
        try {
            logger.debug("removing contact with own address and port nodeID: %s", contact.nodeID);
            self._removeFromShortList(contact.nodeID);
        }
        catch (e) { }
        return callback();
    }
    
    //logger.debug("rpc.send " + contact.address + ":" + contact.port + " message: %j", this.message);

    this.node._rpc.send(contact, this.message, function(err, params) {
        if (err) {
            var msg = util.format("_rpc.send error %s ; contact %j", (err.message ? err.message : err), contact);
            logger.error(msg);
            self._removeFromShortList(contact.nodeID);
            return callback();
        }
        
        //logger.debug("rpc.send result: %j", params);

        self._handleFindResult(params, contact, callback);
    });
};

/**
* Handle the results of the contact query
* #_handleFindResult
* @param {object} params - message response params
* @param {object} contact
* @param {function} callback
*/
Router.prototype._handleFindResult = function (params, contact, callback) {
    var self = this;
    var distance = utils.getDistance(this.hashedKey, contact.nodeID);

    this.contacted[contact.nodeID] = this.node._updateContact(contact);

    if (utils.compareKeys(distance, this.closestNodeDistance) === -1) {
        this.previousClosestNode = this.closestNode;
        this.closestNode = contact;
        this.closestNodeDistance = distance;
    }

    if(this.type === 'NODE') {
        this._addToShortList(params.contacts);
        return callback();
    }

    if(!params.value) {
        this.contactsWithoutValue.push(contact);
        this._addToShortList(params.contacts);
        return callback();
    }

    var parsedValue;
    try {
        if (params.value && (typeof params.value == "object" || typeof params.value == "Object")) {
            parsedValue = params.value.value;
        }
        else if (params.value && (typeof params.value == "string" || typeof params.value == "String")) {
            parsedValue = JSON.parse(params.value).value;
        }
        else {
            throw new Error("invalid params.vale");
        }        
    } 
    catch (err) {
        this.node._log.error('failed to parse value %s', params.value);
        return rejectContact();
    }

    this.node.validateKeyValuePair(this.key, parsedValue, function(isValid) {
        if(!isValid) {
            self.node._log.warn('failed to validate key/value pair for %s', self.key);
            return rejectContact();
        }

        self.foundValue = true;
        self.value = parsedValue;

        callback();
    });

    
    function rejectContact() {
        self._removeFromShortList(contact.nodeID);
        callback();
    }
};

/**
* Add contacts to the shortlist, preserving nodeID uniqueness
* #_addToShortList
* @param {array} contacts
*/
Router.prototype._addToShortList = function(contacts) {
    assert(Array.isArray(contacts), 'No contacts supplied');

    this.shortlist = this.shortlist.concat(contacts);
    this.shortlist = _.uniq(this.shortlist, false, 'nodeID');

};

/**
* Remove contacts with the nodeID from the shortlist
* #_removeFromShortList
* @param {string} nodeID
*/
Router.prototype._removeFromShortList = function(nodeID) {
    this.shortlist = _.reject(this.shortlist, function(c) {
        return c.nodeID === nodeID;
    });

    for (var i = 0; i < this.shortlist.length; i++) {
        if (!this.shortlist[i].nodeID || !this.shortlist[i].address || !this.shortlist[i].port) {
            this.node._log.error('shortlist invalid contact %j', this.shortlist[i]);
            throw new Error('Invalid contact removeFromShortList()');
        }
    }
};

/**
* Handle the results of all the executed queries
* #_handleQueryResults
* @param {function} callback
*/
Router.prototype._handleQueryResults = function(callback) {
    var self = this;

    if (this.foundValue) {
        return this._handleValueReturned(callback);
    }

    var closestNodeUnchanged = this.closestNode === this.previousClosestNode;
    var shortlistFull = this.shortlist.length >= constants.K;

    if (closestNodeUnchanged || shortlistFull) {
        return callback(null, 'NODE', this.shortlist);
    }

    var remainingContacts = _.reject(this.shortlist, function(c) {
        return self.contacted[c.nodeID];
    });

    if (remainingContacts.length === 0) {
        callback(null, 'NODE', this.shortlist);
    } 
    else {
        this._iterativeFind(remainingContacts.splice(0, constants.ALPHA), callback);
    }
};

/**
* Handle a value being returned and store at closest nodes that didn't have it
* #_handleValueReturned
* @param {function} callback
*/
Router.prototype._handleValueReturned = function(callback) {
    var self = this;

    var distances = this.contactsWithoutValue.map(function(contact) {
        return {
            distance: utils.getDistance(contact.nodeID, self.node._self.nodeID),
            contact: contact
        };
    });

    distances.sort(function(a, b) {
        return utils.compareKeys(a.distance, b.distance);
    });

    if (distances.length >= 1) {
        var closestWithoutValue = distances[0].contact;
        
        var message = new Message('STORE', 
            {
                key: self.key,
                value: self.value
            }, 
            this.node._self
        );

        this.node._rpc.send(closestWithoutValue, message);
    }

    callback(null, 'VALUE', self.value);
};

module.exports = Router;
