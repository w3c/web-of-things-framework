/*
 
This file is part of W3C Web-of-Things-Framework.

W3C Web-of-Things-Framework is an open source project to create an Internet of Things framework.
This program is free software: you can redistribute it and/or modify it under the terms of the GNU General Public License as published by 
the Free Software Foundation, either version 3 of the License, or (at your option) any later version.

W3C Web-of-Things-Framework is distributed in the hope that it will be useful, but WITHOUT ANY WARRANTY; without even the implied warranty of 
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the GNU General Public License for more details.

You should have received a copy of the GNU General Public License along with W3C Web-of-Things-Framework.  If not, see <http://www.gnu.org/licenses/>.
 
File created by Tibor Zsolt Pardi
 
Source is based on https://github.com/gordonwritescode  

Copyright (C) 2015 The W3C WoT Team
 
*/

'use strict';

var merge = require('merge');
var assert = require('assert');
var _ = require('lodash');
var async = require('async');
var inherits = require('util').inherits;
var utils = require('./utils');
var events = require('events');
var dgram = require('dgram');
var constants = require('./constants');
var Bucket = require('./bucket');
var Contact = require('./contact');
var Router = require('./router');
var Message = require('./message');
var Item = require('./item');
var transports = require('./transports');
var localstorage = require('./storages/localstorage');
var logger = require('../../../../../logger');

inherits(Node, events.EventEmitter);

Node.DEFAULTS = {
    transport: transports.UDP
};

/**
* Represents a Kademlia node
* @constructor
* @param {object} options
*/
function Node(options) {
    if (!(this instanceof Node)) {
        return new Node(options);
    }

    events.EventEmitter.call(this);

    this._options = merge(Object.create(Node.DEFAULTS), options);
    this._storage = options.storage ? options.storage : new localstorage(options.nick);

    assert(typeof this._storage === 'object', 'No storage adapter supplied');
    assert(typeof this._storage.get === 'function', 'Store has no `get` method');
    assert(typeof this._storage.put === 'function', 'Store has no `put` method');
    assert(typeof this._storage.del === 'function', 'Store has no `del` method');
    assert(typeof this._storage.createReadStream === 'function', 'Store has no `createReadStream` method');

    this._buckets = {};
    this._log = logger;
    this._rpc = new this._options.transport(options);
    this._self = this._rpc._contact;

    this._bindRPCMessageHandlers();
    this._startReplicationInterval();
    this._startExpirationInterval();

    this._log.debug('node created with nodeID %s for nick %s', this._self.nodeID, this._options.nick);
}

/**
* Connects to the overlay network
* #connect
* @param {string} options transport-specific contact options
* @param {function} callback - optional
*/
Node.prototype.connect = function(options, callback) {
    if (callback) {
        this.once('connect', callback);
        this.once('error', callback);
    }

    var self = this;
    var seed = this._rpc._createContact(options);

    //this._log.debug('entering overlay network via %j', seed, {});

    async.waterfall(
        [
            this._updateContact.bind(this, seed),
            this._findNode.bind(this, this._self.nodeID),
            this._refreshBucketsBeyondClosest.bind(this)
        ], 
        function (err) {
            if (err) {
                return self.emit('error', err);
            }

            self.emit('connect', null, (self && self._self ? self._self : null));
        });

    return this;
};

/**
* Validate a key/value pair (defaults to always valid).
* #validateKeyValuePair
* @param {string} key
* @param {mixed} value
* @param {function} callback
*/
Node.prototype.validateKeyValuePair = function(key, value, callback) {
    if(this._options.validateKeyValuePair) {
        return this._options.validateKeyValuePair.apply(this, arguments);
    }
    
    callback(true);
};

/**
* Set a key/value pair in the DHT
* #set
* @param {string} key
* @param {mixed} value
* @param {function} callback
*/
Node.prototype.put = function(key, value, callback) {
    var node = this;

    //this._log.debug('attempting to set value for key %s', key);

    this.validateKeyValuePair(key, value, function(isValid) {
    if(!isValid) {
        //node._log.debug('failed to validate key/value pair for %s', key);
        return callback(new Error('Failed to validate key/value pair'));
    }

    node._putValidatedKeyValue(key, value, callback);
    });
};

/**
* Set a validated key/value pair in the DHT
* #set
* @param {string} key
* @param {mixed} value
* @param {function} callback
*/
Node.prototype._putValidatedKeyValue = function(key, value, callback) {
    var node = this;
    var item = new Item(key, value, this._self.nodeID);
    var message = new Message('STORE', item, this._self);

    this._findNode(item.key, function(err, contacts) {
        if (err) {
            node._log.error('failed to find nodes - reason: %s', err.message);
            return callback(err);
        }
        
        //for (var i = 0; i < contacts.length; i++) {
        //    if (!(contacts[i] instanceof Contact)) {
        //        throw new Error('Invalid contact');
        //    }
        //}

        if (contacts.length === 0) {
            node._log.error('no contacts are available');
            contacts = node._getNearestContacts(key, constants.K, node._self.nodeID);
        }
        
        //node._log.debug('found %d contacts for STORE operation', contacts.length);

        async.each(contacts, function (contact, done) {

            //node._log.debug('sending STORE message to %j', contact, {});

            node._rpc.send(contact, message, done);
        }, 
        callback);
    });
};

/**
* Get a value by it's key from the DHT
* #get
* @param {string} key
* @param {function} callback
*/
Node.prototype.get = function(key, callback) {
    var self = this;

  //this._log.debug('attempting to get value for key %s', key);

    this._storage.get(key, function(err, value) {
        if (!err && value) {
            return callback(null, JSON.parse(value).value);
        }

        self._findValue(key, function(err, value) {
            if (err) {
                return callback(err);
            }

            callback(null, value);
        });

    });
};

/**
* Setup event listeners for rpc messages
* #_bindRPCMessageHandlers
*/
Node.prototype._bindRPCMessageHandlers = function() {
    var self = this;

    this._rpc.on('PING', this._handlePing.bind(this));
    this._rpc.on('STORE', this._handleStore.bind(this));
    this._rpc.on('FIND_NODE', this._handleFindNode.bind(this));
    this._rpc.on('FIND_VALUE', this._handleFindValue.bind(this));
    this._rpc.on('CONTACT_SEEN', this._updateContact.bind(this));
    
    if (this._options.peermsgHandler && (typeof this._options.peermsgHandler == "function")) {
        this._rpc.on('peermsg', this._options.peermsgHandler.bind(this));
    }

    this._rpc.on('ready', function() {
        self._log.debug('node listening on %j', self._self.toString());
    });
};

/**
* Replicate local storage every T_REPLICATE
* #_startReplicationInterval
*/
Node.prototype._startReplicationInterval = function() {
  setInterval(this._replicate.bind(this), constants.T_REPLICATE);
};

/**
* Replicate local storage
* #_replicate
*/
Node.prototype._replicate = function() {
    var self = this;
    var stream = this._storage.createReadStream();

    this._log.info('starting local database replication');

    stream.on('data', function(data) {
        if (typeof data.value === 'string') {
            try {
                data.value = JSON.parse(data.value);
            } 
            catch (err) {
                return self._log.error('failed to parse value from %s', data.value);
            }
        }

        // if we are not the publisher, then replicate every T_REPLICATE
        if (data.value.publisher !== self._self.nodeID) {
            self.put(data.key, data.value.value, function(err) {
                if (err) {
                    self._log.error('failed to replicate item at key %s', data.key);
                }
            });
    
        // if we are the publisher, then only replicate every T_REPUBLISH
        } 
        else if (Date.now() <= data.value.timestamp + constants.T_REPUBLISH) {
            self.put(data.key, data.value.value, function(err) {
                if (err) {
                    self._log.error('failed to republish item at key %s', data.key);
                }
            });
        }
    });

    stream.on('error', function(err) {
        self._log.error('error while replicating: %s', err.message);
    });

    stream.on('end', function() {
        self._log.info('database replication complete');
    });
};

/**
* Expire entries older than T_EXPIRE
* #_startExpirationInterval
*/
Node.prototype._startExpirationInterval = function() {
    setInterval(this._expire.bind(this), constants.T_EXPIRE);
};

/**
* Expire entries older than T_EXPIRE
* #_expire
*/
Node.prototype._expire = function() {
  var self = this;
  var stream = this._storage.createReadStream();

  this._log.info('starting local database expiration');

  stream.on('data', function(data) {
    if (Date.now() <= data.value.timestamp + constants.T_EXPIRE) {
      self._storage.del(data.key, function(err) {
        if (err) {
          self._log.error('failed to expire item at key %s', data.key);
        }
      });
    }
  });

  stream.on('error', function(err) {
    self._log.error('error while expiring: %s', err.message);
  });

  stream.on('end', function() {
    self._log.info('database expiration complete');
  });
};

/**
* Refreshes the buckets farther than the closest known
* #_refreshBucketsBeyondClosest
* @param {string} type
* @param {array} contacts
* @param {function} done
*/
Node.prototype._refreshBucketsBeyondClosest = function(contacts, done) {
    var bucketIndexes = Object.keys(this._buckets);
    var leastBucket = _.min(bucketIndexes);
    var refreshBuckets = bucketIndexes.filter(bucketFilter);
    var queue = async.queue(this._refreshBucket.bind(this), 1);

    //this._log.debug('refreshing buckets farthest than closest known');

    refreshBuckets.forEach(function(index) {
        queue.push(index);
    });

    function bucketFilter(index) {
        return index >= leastBucket;
    }

    done();
};

/**
* Refreshes the bucket at the given index
* #_refreshBucket
* @param {number} index
* @param {function} callback
*/
Node.prototype._refreshBucket = function(index, callback) {
    var random = utils.getRandomInBucketRangeBuffer(index);

    this._findNode(random.toString('hex'), callback);
};

/**
* Search contacts for the value at given key
* #_findValue
* @param {string} key
* @param {function} callback
*/
Node.prototype._findValue = function(key, callback) {
    var self = this;

    //this._log.debug('searching for value at key %s', key);

    this._find(key, 'VALUE', function(err, type, value) {
        if (err || type === 'NODE') {
            return callback(new Error('Failed to find value for key: ' + key));
        }

        //self._log.debug('found value for key %s', key);

        callback(null, value);
    });
};

/**
* Search contacts for nodes close to the given key
* #_findNode
* @param {string} nodeID
* @param {function} callback
*/
Node.prototype._findNode = function(nodeID, callback) {
    var self = this;

    //this._log.debug('searching for nodes close to key %s', nodeID);

    this._find(nodeID, 'NODE', function(err, type, contacts) {
        if (err) {
            return callback(err);
        }

        //self._log.debug('found %d nodes close to key %s', contacts.length, nodeID);

        callback(null, contacts);
    });
};

/**
* Search contacts for nodes/values
* #_find
* @param {string} key
* @param {string} type - ['NODE', 'VALUE']
* @param {function} callback
*/
Node.prototype._find = function(key, type, callback) {
    Router(type, key, this).route(callback);
};

/**
* Update the contact's status
* #_updateContact
* @param {object} contact
* @param {function} callback - optional
*/
Node.prototype._updateContact = function(contact, callback) {
    assert(contact instanceof Contact, 'Invalid contact supplied');

    //this._log.debug('updating contact %j', contact, {});

    var self = this;
    var bucketIndex = utils.getBucketIndex(this._self.nodeID, contact.nodeID);

    assert(bucketIndex < constants.B);

    if (!this._buckets[bucketIndex]) {
        //this._log.debug('creating new bucket for contact at index %d', bucketIndex);
        this._buckets[bucketIndex] = new Bucket();
    }

    var bucket = this._buckets[bucketIndex];
    var inBucket = bucket.hasContact(contact.nodeID);
    var bucketHasRoom = bucket.getSize() < constants.K;
    var contactAtHead = bucket.getContact(0);
    var pingMessage = new Message('PING', {}, this._self);

    contact.seen();

    if (inBucket) {
        //this._log.debug('contact already in bucket, moving to tail');
        bucket.removeContact(contact);
        bucket.addContact(contact);
        complete();
    } else if (bucketHasRoom) {
        //this._log.debug('contact not in bucket, moving to head');
        bucket.addContact(contact);
        complete();
    } else {
        this._log.debug('no room in bucket, sending PING to contact at head');
        this._rpc.send(contactAtHead, pingMessage, function(err) {
            if (err) {
                self._log.debug('head contact did not respond, replacing with new');
                bucket.removeContact(contactAtHead);
                bucket.addContact(contact);
            }

            complete();
        });
    }

    function complete() {
        if (typeof callback === 'function') {
            callback();
        }
    }

    return contact;
};

/**
* Handle `PING` RPC
* #_handlePing
* @param {object} params
*/
Node.prototype._handlePing = function(params) {
    var contact = this._rpc._createContact(params);
    var message = new Message('PONG', { referenceID: params.rpcID }, this._self);

    this._log.info('received PING from %s, sending PONG', params.nodeID);
    this._rpc.send(contact, message);
};

/**
* Handle `STORE` RPC
* #_handleStore
* @param {object} params
*/
Node.prototype._handleStore = function(params) {
    var node = this;
    var item;

    try {
        item = new Item(params.key, params.value, params.nodeID);
    } 
    catch (err) {
        return this._log.error("Item create error %j", err, {});
    }

    //this._log.info('received valid STORE from %s', params.nodeID);

    this.validateKeyValuePair(item.key, params.value, function(isValid) {
        if(!isValid) {
            node._log.debug('failed to validate key/value pair for %s', item.key);
            return;
        }

        node._storeValidatedKeyValue(item, params);
    });
};

/**
* Add the validated ke/value to storage
* #_storeValidatedKeyValue
* @param {object} item
* @param {object} params
*/
Node.prototype._storeValidatedKeyValue = function (item, params) {

    var node = this;

    this._storage.put(item.key, JSON.stringify(item), function(err) {
        var contact = node._rpc._createContact(params);
        var message = new Message(
            'STORE_REPLY', {
                referenceID: params.rpcID,
                success: !!err
            }, 
            node._self);

        //node._log.debug('successful store, notifying %s', params.nodeID);
        node._rpc.send(contact, message);

        // signal an event that the message was stored
        node.emit('msgstored', node._self.nodeID, item );
    });
};


/**
* Handle `FIND_NODE` RPC
* #_handleFindNode
* @param {object} params
*/
Node.prototype._handleFindNode = function(params) {
    //this._log.info('received FIND_NODE from %j', params, {});

    var contact = this._rpc._createContact(params);
    var near = this._getNearestContacts(params.key, constants.K, params.nodeID);

    var message = new Message(
        'FIND_NODE_REPLY', 
        {
            referenceID: params.rpcID,
            contacts: near
        }, 
        this._self);

    //this._log.debug('sending %s nearest %d contacts', params.nodeID, near.length, {});

    this._rpc.send(contact, message);
};

/**
* Handle `FIND_VALUE` RPC
* #_handleFindValue
* @param {object} params
*/
Node.prototype._handleFindValue = function(params) {
    var node = this;
    var contact = this._rpc._createContact(params);
    var limit = constants.K;

    //this._log.info('received valid FIND_VALUE from %s', params.nodeID);

    this._storage.get(params.key, function(err, value) {
        if (err || !value) {
            //node._log.debug('value not found, sending contacts to %s', params.nodeID);

            var notFoundMessage = new Message('FIND_VALUE_REPLY', {
            referenceID: params.rpcID,
            contacts: node._getNearestContacts(params.key, limit, params.nodeID)
            }, node._self);

            return node._rpc.send(contact, notFoundMessage);
        }

        //node._log.debug('found value, sending to %s', params.nodeID);

        var foundMessage = new Message('FIND_VALUE_REPLY', {
            referenceID: params.rpcID,
            value: value
        }, contact);

        node._rpc.send(contact, foundMessage);
    });
};

/**
* Return contacts closest to the given key
* #_getNearestContacts
* @param {string} key
* @param {number} limit
* @param {string} nodeID
*/
Node.prototype._getNearestContacts = function(key, limit, nodeID) {
    var contacts = [];
    var hashedKey = utils.createID(key);
    var initialIndex = utils.getBucketIndex(this._self.nodeID, hashedKey);
    var ascBucketIndex = initialIndex;
    var descBucketIndex = initialIndex;

    if (this._buckets[initialIndex]) {
        addNearestFromBucket(this._buckets[initialIndex]);
    }

    while (contacts.length < limit && ascBucketIndex < constants.B) {
        ascBucketIndex++;

        if (this._buckets[ascBucketIndex]) {
            addNearestFromBucket(this._buckets[ascBucketIndex]);
        }
    }

    while (contacts.length < limit && descBucketIndex >= 0) {
        descBucketIndex--;

        if (this._buckets[descBucketIndex]) {
            addNearestFromBucket(this._buckets[descBucketIndex]);
        }
    }

    function addToContacts(contact) {
        var isContact = contact instanceof Contact;
        var poolNotFull = contacts.length < limit;
        var notRequester = contact.nodeID !== nodeID;

        if (isContact && poolNotFull && notRequester) {
            contacts.push(contact);
        }
    }

    function addNearestFromBucket(bucket) {
        var contactList = bucket.getContactList();
        var distances = contactList.map(addDistance).sort(sortKeysByDistance);
        var howMany = limit - contacts.length;

        distances.splice(0, howMany).map(pluckContact).forEach(addToContacts);
    }

    function pluckContact(c) {
        return c.contact;
    }

    function sortKeysByDistance(a, b) {
        return utils.compareKeys(a.distance, b.distance);
    }

    function addDistance(contact) {
        return {
            contact: contact,
            distance: utils.getDistance(contact.nodeID, hashedKey)
        };
    }

    return contacts;
};

module.exports = Node;
