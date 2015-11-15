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

var util = require('util');
var assert = require('assert');
var crypto = require('crypto');
var jwt = require('./jwt');
var jwe = require('./jwe').handler;


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
    PUBKEY: "public_key",
    ECDHPK: "ecdh_public",
    HOST: "address",
    PORT: "port"
}

WoTMessage.prototype.PEERMSG = {
    ID: 0x75115507,
    SEND: 0xDAD
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


WoTMessage.prototype.serialize = function (input) {
    var text = null;
    try {
        if (typeof input != 'string') {
            if (typeof input == 'object') {
                try {
                    text = JSON.stringify(input);
                }
                catch (e) {
                    text = input.toString();
                }
            }
            else {
                text = input.toString();
            }
        }
        else {
            text = input;
        }
    }
    catch (err) {
        throw new Error("Error in serializing payload, error: %j", err, {});
    }
    
    if (!text)
        throw new Error("Error in serializing payload");

    return text;
}

WoTMessage.prototype.parse_peermsg = function (buffer, ecdh_key, getkeyfn, callback) {
    var self = this;

    if (!buffer) {
        throw new Error("WoTMessage parse_peermsg error: msg parameter is missing");
    }
    
    if (!util.isBuffer(buffer)) {
        throw new Error("WoTMessage parse_peermsg error: invalid buffer");
    }
    
    var id = buffer.readUInt32BE(0);
    var type = buffer.readUInt16BE(4);
    if (id != this.PEERMSG.ID || type != this.PEERMSG.SEND) {
        throw new Error("WoTMessage parse_peermsg error: invalid peer message");
    }

    var payload = buffer.toString('utf8', 6);
    var elements = jwt.parse(payload);
    
    var payload_element = elements[1];
    
    getkeyfn(payload_element.iss, function (err, contact) {
        try {
            if (err) {
                return callback(err);
            }
            
            // first verify the message 
            var decoded_payload = self.decode(payload, contact[self.MSGFIELD.PUBKEY]);
            if (!decoded_payload) {
                return callback("parse_peermsg jwt.decode returned invalid payload" );
            }
            
            // decrypt the symmetric cipher text
            var cipher_text = decoded_payload.data;
            if (!cipher_text) {
                return callback("parse_peermsg jwt.decode returned invalid cipher text");
            }

            var ecdhpk = contact[self.MSGFIELD.ECDHPK];
            
            //  The payload must be an JSON Web Encryption (JWE) data structure
            //  Decode and decrypt the JWE structure
            var plain_text = jwe.decrypt(ecdh_key, ecdhpk, cipher_text);
            // it must be a JSON data object
            var data = JSON.parse(plain_text);
            
            callback(null, data);
        }
        catch (e) {
            callback("parse_peermsg exception " + e.message);
        }
    });  
}


WoTMessage.prototype.create_peermsg = function (ECC_private_key, ECDH_key, ECDH_public, payload, issuer, audience, expires) {
    if (!ECC_private_key) {
        throw new Error("WoTMessage create_peermsg error: private_key parameter is missing");
    }
    if (!ECDH_key) {
        throw new Error("WoTMessage create_peermsg error: ECDH key parameter is missing");
    }
    if (!ECDH_public) {
        throw new Error("WoTMessage create_peermsg error: ECDH public key parameter is missing");
    }
    if (!payload) {
        throw new Error("WoTMessage create_peermsg error: payload parameter is missing");
    }
    
    var datastr = this.serialize(payload);
    
    // get JSON Web Encryption (JWE) encrypted structure
    var cipher_text = jwe.encrypt(jwe.CRYPTOSYS.ECC, ECDH_key, ECDH_public, datastr);
    var data = {data: cipher_text}
    
    // create a JSON Web Token (JWT)
    var token = this.create(ECC_private_key, data, null, expires, issuer, null, audience);
    assert(token && (typeof token == 'string'), "Invalid JWT token, token must be string");
    
    //  Add the peer message headers
    //  This is a WoT specific implementation to define WoT peer to peer messages
    var len = token.length;
    var buffer = new Buffer(len + 6);
    buffer.writeUInt32BE(this.PEERMSG.ID, 0);
    buffer.writeUInt16BE(this.PEERMSG.SEND, 4);
    // combine the header and JWT token
    buffer.write(token, 6, len);
    
    return buffer;
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
