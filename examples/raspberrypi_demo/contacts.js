
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

var async = require('async');
streembit.config = require("./config.json");
streembit.PeerNet = require("./peernet");
streembit.Node = require("./peernet").Node;
streembit.ContactList = require("./contactlist");

streembit.Contacts = (function (contactsobj, logger, events, config) {
    
    var contacts = streembit.ContactList;
    var pending_contacts = {};
    
    var Contact = function (param) {
        var contobj = {
            isonline: false,
            lastping: 0,
            errors: [],
            public_key: "", 
            ecdh_public: "", 
            address: "", 
            port: 0, 
            name: "",                    
            protocol: "",
            user_type: "",
            
            ping: function () {
                var _self = this;
                
                streembit.PeerNet.ping(this, false, 10000)
                .then(
                    function () {
                        _self.lastping(Date.now());
                        _self.isonline(true);
                        logger.debug("contact " + _self.name + " is online");
                    },
                    function (err) {
                        _self.lastping(Date.now());
                        _self.isonline(false);
                        //  if the contact is offline then that is not an error 
                        if ((typeof err == 'string' && err.indexOf("TIMEDOUT") > -1) || (err.message && err.message.indexOf("TIMEDOUT") > -1)) {
                            logger.debug("Ping to contact " + self.name + " timed out");
                        }
                        else {
                            _self.errors.push(util.format("Ping to contact error: %j", err));
                        }
                    }
                );
            }
        };
        
        if (param) {
            for (var prop in param) {
                contobj[prop] = param[prop];
            }
        }
        
        return contobj;
    };
    
    function find_contact_onnetwork(contact_address, contact_port, contact_protocol, contact_name, callback) {
        streembit.PeerNet.find_contact(contact_name, function (err, contact) {
            try {
                if (err) {
                    logger.error("Contact search error %j", err);
                    return callback();
                }
                if (!contact) {
                    logger.error("Couldn't find contact " + contact_name + " on the network");
                    return callback();
                }
                
                if (contact_address && contact_port && contact_protocol) {
                    //  the NOED_FIND Kademlia call returned a contact which could be more current than 
                    //  the stored contact so use the current address info
                    contact.address = contact_address;
                    contact.port = contact_port;
                    contact.protocol = contact_protocol;
                }
                
                callback(contact);
                //
            }
            catch (err) {
                logger.error("find_contact error: %j", err);
            }
        });
    }
    
    function ping_contact(account) {
        if (!account) {
            return logger.error("ping_contact error: invalid parameters");
        }
        
        var contact = contactsobj.get_contact(account);
        if (!contact) return;
        
        contact.ping();
        
        logger.debug("ping contact " + account);
    }
    
    function init_contact(param_contact, callback) {
        try {
            var contact_name = param_contact.name;
            var public_key = param_contact.public_key;
            logger.debug("initialzing, find contact " + contact_name + " public key: " + public_key);
            
            streembit.PeerNet.get_published_contact(contact_name, function (err, contact) {
                if (err) {
                    logger.error("get_published_contact error: %j", err);
                    return callback();
                }
                
                if (!contact || contact_name != contact.name) {
                    logger.error("Couldn't find contact " + account + " on the network");
                    return callback();
                }
                
                contacts.update(contact_name, contact);
                
                try {
                    streembit.Node.find_contact(contact_name, public_key)
                    .then(
                        function (contact_node) {
                            try {
                                if (!contact_node) {
                                    setTimeout(function () {
                                        callback();
                                    }, 1000);
                                    return;
                                }
                                
                                // validate the public key
                                var pk = contacts.get_public_key(contact_node.name);
                                if (pk != contact_node.public_key) {
                                    logger.error("find_contact public key mismatch for " + contact_node.name);
                                    
                                    // remove the contact
                                    contacts.delete(contact_node.name);
                                    
                                    setTimeout(function () {
                                        callback();
                                    }, 3000);
                                    return;
                                }
                                
                                if (contact_node && 
                                    contact_node.name == contact_name && 
                                    contact_node.address && 
                                    contact_node.port && 
                                    contact_node.protocol) {
                                    if (contact_node.address != contact.address || contact_node.port != contact.port || contact_node.protocol != contact.protocol) {
                                        contact.address = contact_node.address;
                                        contact.port = contact_node.port;
                                        contact.protocol = contact_node.protocol;
                                        contacts.update(contact_name, contact);                                        
                                        logger.debug("contact " + contact_node.name + " populated from network and updated. address: " + contact_node.address + ". port: " + contact_node.port + ". protocol: " + contact_node.protocol);                                
                                    }
                                }                                
                                
                                setTimeout(function () {
                                    callback();
                                }, 1000);
                            }
                            catch (err) {
                                logger.error("find_contact error: %j", err);
                                callback();
                            }
                        
                        },
                        function (err) {
                            logger.error("find_contact error: %j", err);
                            callback();
                        }
                    );
                }
                catch (err) {
                    logger.error("find_contact error: %j", err);
                    callback();
                }
                
            });
        }
        catch (err) {
            logger.error("Error in initializing contacts: %j", err);
        }
    }
    
   
    contactsobj.remove = function (account, callback) {
        contacts.delete(account);
        if (callback) {
            callback();
        }
    }
    
    contactsobj.search = function (account, callback) {
        try {
            logger.debug("search " + account);
            streembit.PeerNet.find_contact(account, function (err, contact) {
                if (err) {
                    return logger.error('The contact search for account "' + account + '" returned no result');
                }
                
                callback(contact);                                
            });
        }
        catch (err) {
            logger.error("Contact search error %j", err)
        }
    }
    
    contactsobj.on_online = function (account) {
        var contact = contacts.get(account);
        if (contact) {
            contact.isonline = true;
        }
    }
    
    contactsobj.init = function (callback) {
        try {
            contacts.init();
            var list_of_contacts = contacts.list();
            
            async.eachSeries(list_of_contacts, init_contact, function (err) {
                var msg = "contacts initialization";
                if (err) {
                    msg += " error: " + err;
                    callback(msg);
                }
                else {
                    msg += " completed.";
                    logger.info(msg);
                    callback();
                }
            });

        }
        catch (err) {
            logger.error("Error in initializing contacts: %j", err);
        }
    }
    
    return contactsobj;

}(streembit.Contacts || {}, global.applogger, global.appevents, streembit.config));


module.exports = streembit.Contacts;