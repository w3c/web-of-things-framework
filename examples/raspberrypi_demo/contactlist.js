
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

streembit.config = require("./config.json");
streembit.DEFS = require("./appdefs.js");

streembit.ContactList = (function (listobj, logger, events, config) {

    listobj.contacts = [];
    
    listobj.get = function (account) {
        var contact = null;
        for (var i = 0; i < listobj.contacts.length; i++) {
            if (listobj.contacts[i].name == account) {
                contact = listobj.contacts[i];
                break;
            }
        }
        return contact;
    }
    
    listobj.get_public_key = function (account) {
        var pk = null;
        for (var i = 0; i < listobj.contacts.length; i++) {
            if (listobj.contacts[i].name == account) {
                pk = listobj.contacts[i].public_key;
                break;
            }
        }
        return pk;
    }
    
    listobj.update = function (account, contact, callback) {
        
        if (!listobj.exists(account)) {
            throw new Error("the contact does not exists in the configuration list");
        }
        
        for (var i = 0; i < listobj.contacts.length; i++) {
            if (listobj.contacts[i].name == account) {
                listobj.contacts[i].isonline = contact.isonline;
                listobj.contacts[i].lastping = contact.lastping;
                listobj.contacts[i].errors = contact.errors;
                listobj.contacts[i].public_key = contact.public_key; // should be the same if we got here
                listobj.contacts[i].ecdh_public = contact.ecdh_public || listobj.contacts[i].ecdh_public;
                listobj.contacts[i].address = contact.address;
                listobj.contacts[i].port = contact.port;
                listobj.contacts[i].protocol = contact.protocol ? contact.protocol : streembit.DEFS.TRANSPORT_TCP;
                listobj.contacts[i].user_type = contact.user_type;
                break;
            }
        }
        
        if (callback) {
            callback();
        }
    };
    
    listobj.update_contact_database = function (contact, callback) {
        listobj.update(contact.name, contact, callback);
    };
    
    listobj.exists = function (account) {
        var isexists = false;
        for (var i = 0; i < listobj.contacts.length; i++) {
            if (listobj.contacts[i].name == account) {
                isexists = true;
                break;
            }
        }
        return isexists;
    }
    
    listobj.delete = function (account) {
        var pos = listobj.contacts.map(
            function (e) {
                return e.name;
            }
        ).indexOf(account);
        
        listobj.contacts.splice(pos, 1);
    }
    
    listobj.init = function (callback) {
        var list = streembit.config.contacts;
        if (!list || !Array.isArray(list) || list.length == 0)
            throw new Error("invalid contact list in the configuration file");
        
        for (var i = 0; i < list.length; i++) {
            listobj.contacts.push(list[i]);
        }
    }
    
    listobj.list = function () {
        var array = [];
        for (var i = 0; i < listobj.contacts.length; i++) {
            array.push(listobj.contacts[i]);
        }
        return array;
    }
    
    listobj.on_online = function (contact) {
        for (var i = 0; i < listobj.contacts.length; i++) {
            if (listobj.contacts[i].name == contact.name) {
                listobj.contacts[i].isonline = true;
                break;
            }
        }
    }

    return listobj;

}(streembit.ContactList || {}, global.applogger, global.appevents, streembit.config));


module.exports = streembit.ContactList;