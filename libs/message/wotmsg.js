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

var assert = require('assert');
var crypto = require('crypto');
var jwt = require('./jwt');

function WoTMessage() {
    if (!(this instanceof WoTMessage)) {
        return new WoTMessage();
    }
}

WoTMessage.prototype.MSGTYPE =  {
    ADDPK: 0x01,    //  Add public key to the network. Must perform this when the node joins first time to the P2P network
    UPDPK: 0x02,    //  Update existing public key on the network. The update message is signed with the existing private key
    DELPK: 0x03     //  Remove the existing public key from the network
}

WoTMessage.prototype.MSGFIELD = {
    PUBKEY: "public_key"
}

WoTMessage.prototype.create = function (private_key, payload, algorithm, expires, issuer, subject, audience) {    
    if (!private_key) {
        throw new Error("WoTMessage error: private_key parameter is missing");
    }
    
    if (!payload) {
        throw new Error("WoTMessage error: payload parameter is missing");
    }
    
    var input = {};

    // create a data field for the actual data if not exists
    if (payload.hasOwnProperty('data') == false) {
        input.data = payload;
    }
    else {
        input = payload;
    }

    var options = {};

    options.algorithm = algorithm || 'ES256';

    // currently only ECC is supported    
    assert(options.algorithm == "ES256" || options.algorithm == "ES384" || options.algorithm == "ES512", "In this version only elliptic curve cryptography algorithms supported");
    
    if (expires) {
        options.expires = expires;
    }
    
    if (issuer) {
        options.issuer = issuer;
    }
    
    if (subject) {
        options.subject = subject;
    }
    
    if (audience) {
        options.audience = audience;
    }
    
    // create a json web token
    var token = jwt.encode(input, private_key, options);
    
    return token;    
}

WoTMessage.prototype.decode = function (payload, public_key) {
    if (!public_key) {
        throw new Error("WoTMessage decode error: public_key parameter is missing");
    }
    
    if (!payload) {
        throw new Error("WoTMessage decode error: payload parameter is missing");
    }

    var message = jwt.decode(payload, public_key);

    return message;
}

WoTMessage.prototype.get_message_payload = function(msg){
    var payload = jwt.get_message_payload(msg);
    return payload;
}


module.exports = WoTMessage;
