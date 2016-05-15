/*

This file is part of Streembit application. 
Streembit is an open source project to create a real time communication system for humans and machines. 

Streembit is a free software: you can redistribute it and/or modify it under the terms of the GNU General Public License 
as published by the Free Software Foundation, either version 3.0 of the License, or (at your option) any later version.

Streembit is distributed in the hope that it will be useful, but WITHOUT ANY WARRANTY; without even the implied warranty 
of MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the GNU General Public License for more details.

You should have received a copy of the GNU General Public License along with Streembit software.  
If not, see http://www.gnu.org/licenses/.
 
-------------------------------------------------------------------------------------------------------------------------
Author: Tibor Zsolt Pardi 
Copyright (C) 2016 The Streembit software development team
-------------------------------------------------------------------------------------------------------------------------

*/


'use strict';

var streembit = streembit || {};

var assert = require('assert');
var wotmsg = require("streembitlib/message/wotmsg");
var wotkad = require('streembitlib/kadlib');
var uuid = require("uuid");
var nodecrypto = require("crypto");
var net = require("net");
var config = require('./config');
streembit.account = require("./account");
streembit.DEFS = require("./appdefs.js");
streembit.Message = require("./message");

streembit.PeerTransport = ( function (peerobj, logger, events, config) {

    var DEFAULT_STREEMBIT_PORT = 32320;

    peerobj.node = 0;
    peerobj.db = 0;
    peerobj.is_publickey_uplodaed = false;
    peerobj.is_connected = false;
    
    var listOfContacts = {};


    //  TODO validate the time and remove contact after an idle period
    function updateContact(contact) {
        if (contact && contact.account) {
            var cobj = {
                public_key: contact.public_key,
                nodeID: contact.nodeID,
                address: contact.address,
                port: contact.port,
                updated: Date.now(),
                protocol: streembit.DEFS.TRANSPORT_TCP,
                account: contact.account
            }
            listOfContacts[contact.account] = cobj;

            events.emit(events.APPEVENT, "contact_seen", cobj);
        }
    }
    
    function isContactAllowed(contact) {
        //TODO for private networks    
        return true;
    }

    function validateMessage(params, contact, callback) {
        var is_update_key = false, is_system_update_key = false, msgid = 0;
        
        try {
            var payload = wotmsg.getpayload(params.value);
            if (!payload || !payload.data || !payload.data.type) {
                return callback("validateMessage error invalid payload");
            }
            
            if (payload.data.type == wotmsg.MSGTYPE.PUBPK || payload.data.type == wotmsg.MSGTYPE.UPDPK || payload.data.type == wotmsg.MSGTYPE.DELPK) {
                if (!payload.data[wotmsg.MSGFIELD.PUBKEY]) {
                    return callback("validateMessage error invalid public key payload");
                }
                is_update_key = true;
            }
            
            var account_key;
            if (is_update_key) {
                //  is_update_key == true -> the publisher claims this is a public key store, update or delete message
                //  check if the existing key does exits and if yes then validate the message
                account_key = params.key;
            }
            else {
                //  get the iss field of the JSON web token message
                account_key = payload.iss;
            }
            
            if (!account_key) {
                return callback("validateMessage error: invalid public key account field");
            }
            
            if (payload.data.type == wotmsg.MSGTYPE.DELMSG) {
                // only the owner (recipient) of the message can delete the message
                try {
                    var msgtags = params.key.split("/");
                    if (!msgtags || !msgtags.length || msgtags.length < 3 || msgtags[0] != account_key || msgtags[1] != "message") {
                        return callback("validateMessage error: delete message failed.");
                    }
                }
                catch (err) {
                    return callback("validateMessage error: delete message failed, parse exception");
                }
            }
        }
        catch (err) {
            return callback("onKadMessage error: " + err.message);
        }
        
        peerobj.node.get(account_key, function (err, value) {
            try {
                if (err) {
                    if (is_update_key && err.message && err.message.indexOf("0x0100") > -1) {
                        logger.debug('validateMessage PUBPK key not exists on the network, allow to complete PUBPK message');
                        //  TODO check whether the public key matches with private network keys
                        return callback(null, true);
                    }
                    else {
                        return callback('validateMessage get existing PK error: ' + err.message);
                    }
                }
                else {
                    logger.debug("validateMessage decode wot message");
                    var stored_payload = wotmsg.getpayload(value);
                    var stored_pkkey = stored_payload.data[wotmsg.MSGFIELD.PUBKEY];
                    if (!stored_pkkey) {
                        return callback('validateMessage error: stored public key does not exists');
                    }
                    
                    //  if this is a private network then the public key must matches with the account's key in the list of public key
                    //  TODO check whether the public key matches with private network keys
                    
                    if (payload.data.type == wotmsg.MSGTYPE.PUBPK) {
                        if (payload.data[wotmsg.MSGFIELD.PUBKEY] != stored_pkkey) {
                            return callback('validateMessage error: stored public key and message public key do not match');
                        }
                    }                    
                    
                    logger.debug("validateMessage validate account: " + account_key + " public key: " + stored_pkkey);
                    
                    if (payload.data.type == wotmsg.MSGTYPE.PUBPK || 
                        payload.data.type == wotmsg.MSGTYPE.UPDPK || 
                        payload.data.type == wotmsg.MSGTYPE.DELPK ||
                        payload.data.type == wotmsg.MSGTYPE.OMSG ||
                        payload.data.type == wotmsg.MSGTYPE.DELMSG) {
                        
                        var decoded_msg = wotmsg.decode(params.value, stored_pkkey);
                        if (!decoded_msg) {
                            return callback('VERIFYFAIL ' + account);
                        }
                        
                        //  passed the validation -> add to the network
                        logger.debug('validateMessage validation for msgtype: ' + payload.data.type + '  is OK');
                        
                        //node._log.debug('data: %j', params);
                        callback(null, true);
                    }
                }
            }
            catch (val_err) {
                logger.error("validateMessage error: " + val_err.message);
            }
        });
    }
    
    function onKadMessage(message, contact, next) {
        try {
            
            // TODO check for the private network
            if (!isContactAllowed(contact)) {
                return next(new Error('Message dropped, reason: contact ' + contact.account + ' is not allowed'));
            }
            
            updateContact(contact);

            if (!message || !message.method || message.method != "STORE" || 
                !message.params || !message.params.item || !message.params.item.key) {
                
                // only validate the STORE messages
                return next();
            }
            
            logger.debug('validate STORE key: ' + message.params.item.key);
            
            validateMessage(message.params.item, contact, function (err, isvalid) {
                if (err) {
                    return next(new Error('Message dropped, error: ' + ((typeof err === 'string') ? err : (err.message ? err.message :  "validation failed"))));
                }
                if (!isvalid) {
                    return next(new Error('Message dropped, reason: validation failed'));
                }
                
                // valid message
                return next();
            });
        }
        catch (err) {
            logger.error("onKadMessage error: " + err.message);
            next("onKadMessage error: " + err.message);
        }
    }
    
    function expireHandler(data, callback) {
        try {
            if (!data || !data.key || !data.value) {
                logger.debug("delete invalid message");
                return callback(true);
            }
            
            var msgobj = JSON.parse(data.value);
            if (!msgobj || !msgobj.value) {
                // invalid data
                return callback(true);
            }
            
            // get the payload
            var payload = wotmsg.getpayload(msgobj.value);
            
            if (data.key.indexOf("/") == -1) {
                //  The account-key messages publishes the public key of the account to the network
                //  Delete the message if it is marked to be deleted, otherwise never delete the account-key messages           
                
                if ((!payload || !payload.data || !payload.data.type) || payload.data.type == wotmsg.MSGTYPE.DELPK) {
                    logger.debug('DELETE public key of ' + data.key);
                    return callback(true);
                }
                
                // return, no delete
                return callback();
            }
            
            if (!msgobj.timestamp) {
                logger.debug("delete message without timestamp, key: %s", data.key);
                return callback(true);
            }
            
            // check for MSGTYPE.DELMSG
            if (payload.data.type == wotmsg.MSGTYPE.DELMSG) {
                logger.debug("delete message with type DELMSG, key: %s", data.key);
                return callback(true);
            }
            
            var currtime = Date.now();
            var expiry_time = 0;
            var keyitems = data.key.split("/");
            if (keyitems && keyitems.length > 2 && keyitems[1] == "message") {
                expiry_time = value.timestamp + T_MSG_EXPIRE;
            }
            else {
                expiry_time = value.timestamp + T_ITEM_EXPIRE;
            }
            
            if (expiry_time <= currtime) {
                logger.debug("delete expired message %s", data.key);
                callback(true);
            }
            else {
                callback();
            }
        }
        catch (err) {
            // delete the time which triggered error
            callback(true);
            logger.error("expireHandler error: %j", err);
        }
    }
    
    function findRangeMessages(query, callback) {
        try {
            logger.debug('findRangeMessages for %s', query);
            
            if (!peerobj.db) {
                throw new Error("invalid database object");    
            }
            
            var self = peerobj;
            var stream = peerobj.db.createReadStream();
            
            var key, count = 0, page = 10, start = 0;
            var messages = [];
            
            var params = querystring.parse(query);
            if (!params.key) {
                return callback('key is missing in range query');
            }
            key = params.key;
            
            if (params.page) {
                page = params.page;
            }
            if (params.start) {
                start = params.start;
            }
            
            stream.on('data', function (data) {
                if (data && data.key && (typeof data.key === 'string') && data.value && (typeof data.value === 'string')) {
                    try {
                        if (data.key.indexOf(key) > -1) {
                            var jsonobj = JSON.parse(data.value);
                            if (jsonobj.value) {
                                var payload = wotmsg.getpayload(jsonobj.value);
                                if (payload.data.type != wotmsg.MSGTYPE.DELMSG) {
                                    if (count >= start && messages.length < page) {
                                        messages.push({ key: data.key, value: jsonobj.value });
                                    }
                                    count++;
                                }
                            }
                        }
                    } 
                    catch (err) {
                        logger.error('findRangeMessages error: %j', err);
                    }
                }
            });
            
            stream.on('error', function (err) {
                callback(err.message ? err.message : err);
            });
            
            stream.on('end', function () {
                callback(null, count, page, start, messages);
            });
        }
        catch (err) {
            logger.error('findRangeMessages error: %j', err);
            callback(err.message ? err.message : err);
        }
    };

    function onPeerMessage (message, info) {
        try {
            if (!message) {
                return logger.error("Invalid message at onPeerMessage");
            }
            if (!message.type || message.type != "PEERMSG") {
                return logger.error("Invalid message type at onPeerMessage");
            }
            if (!message.data) {
                return logger.error("Invalid message data at onPeerMessage");
            }
            
            //  raise an application event that a peer sent a message
            events.emit(events.APPEVENT, events.TYPES.ONPEERMSG, message.data, info);
            
        }
        catch (err) {
            logger.error("onPeerMessage error %j", err);
        }
    }    
    
    function msg_stored(node_id, item) {
        if (!item || !item.key || !item.hash)
            return;
        
        //logger.debug("peertransport msg_stored, item.key: " + item.key);
        
        var key = item.key;
        if (item && key && item.value ) {
            if ( key.indexOf("/") == -1) {
                //  this is a contact update
                //events.emit(events.CONTACT_ONLINE, item.key, item);
            }
            else {
                var msgkey = streembit.User.name + "/message/";
                if (key.indexOf(msgkey) > -1 && item.recipient == streembit.User.name) {
                    //logger.debug("off-line message item: %j", item);
                    var items = [item];
                    events.emit(events.APPEVENT, events.TYPES.ONACCOUNTMSG, items);
                }
            }
        }
    }    

    function onTransportError(err) {
        logger.error('RPC error: %j', err);
    }
    
    function get_account_id() {
        var id = uuid.v4().toString();
        var accountId = id.replace(/-/g, '');
        return accountId;        
    }
    
    peerobj.is_node_connected = function () {
        return peerobj.is_connected;
    }
    
    peerobj.get_buckets = function () {
        if (peerobj.node) {
            var buckets = peerobj.node._router._buckets;
            return buckets;
        }
    },    
    
    peerobj.start = function (streembitdb, callback) {
        try {
            
            logger.info('Bootstrap P2P network');
            
            assert(config.node.address, "address must exists in the config field of config.json file");
            assert(config.node.port, "port must exists in the config field of config.json file");
            assert(streembit.account.public_key, "account public key must be initialized");
            
            var param = {
                address: config.node.address,
                port: config.node.port,
                account: streembit.account.name || "",
                public_key: streembit.account.public_key
            };
            
            var contact = wotkad.contacts.StreembitContact(param);
            
            var transport_options = {
                logger: logger
            };
            var transport = wotkad.transports.TCP(contact, transport_options);
            
            transport.after('open', function (next) {
                // exit middleware stack if contact is blacklisted
                logger.info('TCP peer connection is opened');
                
                // otherwise pass on
                next();
            });
            
            // message validator
            transport.before('receive', onKadMessage);
            
            // handle errors from RPC
            transport.on('error', onTransportError);
            
            var options = {
                transport: transport,
                logger: logger,
                storage: streembitdb,
                seeds: config.node.seeds,
                onPeerMessage: onPeerMessage,
                expireHandler: expireHandler,
                findRangeMessages: findRangeMessages
            };
            
            wotkad.create(options, function (err, peer) {
                if (err) {
                    return callback(err);
                }
                
                streembit.account.port = config.node.port;
                streembit.account.address = config.node.address;
                
                peerobj.db = streembitdb;
                peerobj.node = peer;
                callback();
            });

            //
            //
        }
        catch (err) {
            callback("P2P handler start error " + err.message);
        }
    }
    
    peerobj.validate_connection = function (callback) {
        try {
            if (!peerobj.node || !peerobj.is_connected) {
                return callback("the node is not connected");
            }

            var count = 0;
            var buckets = peerobj.node._router._buckets;;
            if (buckets) {
                for (var prop in buckets) {
                    var bucket = buckets[prop];
                    if (bucket._contacts) {
                        for (var i = 0; i < bucket._contacts.length; i++) {
                            logger.debug("bucket contact: %j", bucket._contacts[i]);
                            count++;
                        }
                    }
                }
            }
            
            if (!count) {
                // if seeds are defined then contacts mustr exists in the bucket
                callback("no contacts exist in the bucket");
            }
            else {
                callback();
            }           
        }
        catch (e) {
            callback(e);
        }
    }

    peerobj.put = function (key, value, callback) {
        //  For this public key upload message the key is the device name
        //  false == don't store locally
        peerobj.node.put(key, value, function (err, results) {
            if (callback) {
                callback(err, results);
            }
        });
    }
    
    peerobj.get = function (key, callback) {
        if (!callback || (typeof callback != "function"))
            throw new Error("invalid callback at node get");

        //  For this public key upload message the key is the device name
         peerobj.node.get(key, function (err, msg) {
            callback(err, msg);
        });
    }    
    
    peerobj.find_contact = function (account, public_key, callback) {
        if (!callback || (typeof callback != "function"))
            throw new Error("invalid callback at find_node");
        
        //  For this public key upload message the key is the device name
        wotkad.find_contact(peerobj.node, account, public_key, function (err, contact) {
            if (!err && contact && contact.account == account) {
                contact.protocol = streembit.DEFS.TRANSPORT_TCP;
                contact.name = account;
                callback(err, contact);
            }
            else {
                callback(err, null);
            }
        });
    }    

    peerobj.peer_send = function (contact, data) {
        try {
            if (!data) {
                throw new Error("peer_send invalid data parameter");
            }
            if (!contact || !contact.address || !contact.port ) {
                throw new Error("peer_send invalid contact parameter");
            }
            
            var message = streembit.Message.create_peermsg(data);
            
            var client = net.connect( 
                { port: contact.port, host: contact.address },
                function () {
                    client.write(message);
                    client.end();
                }
            );
            
            client.on('end', function () {
            });
            
            client.on('error', function (err) {
                logger.error("peer_send failed " + contact.address + ":" + contact.port + ". error: " + (err.message ? err.message : err));
            });

        }
        catch (err) {
            logger.error("peer_send error:  %j", err);
        }
    }
    
    peerobj.get_range = function (msgkey, callback) {
        try {
            if (!msgkey ) {
                throw new Error("get_account_messages invalid msgkey parameter");
            }

            peerobj.node.get_range( msgkey, callback);
        }
        catch (err) {
            logger.error("streembit.PeerTransport.get_range error:  %j", err);
        }
    }    
    
    peerobj.delete_item = function (key, request) {
        peerobj.node.delete_item(key, request);
    }
    
    peerobj.get_seeds = function () {
        var seeds = [];
        if (!peerobj.node) {
            return seeds;   
        }
        
        var buckets = peerobj.node._router._buckets;
        if (buckets) {
            for (var prop in buckets) {
                var bucket = buckets[prop];
                if (bucket._contacts) {
                    for (var i = 0; i < bucket._contacts.length; i++) {
                        seeds.push(bucket._contacts[i]);
                    }
                }
            }
        }

        return seeds;
    }    

    return peerobj;

}( streembit.PeerTransport || {}, global.applogger, global.appevents, config));


module.exports = streembit.PeerTransport;