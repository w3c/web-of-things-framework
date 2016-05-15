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

var nodecrypto = require(global.cryptolib);
var wotmsg = require("streembitlib/message/wotmsg");
var uuid = require("uuid");

streembit.Message = (function (msgobj, logger, events) {
    
    msgobj.getvalue = function (val) {
        return wotmsg.base64decode(val);
    }
    
    msgobj.decode = function (payload, public_key) {
        return wotmsg.decode(payload, public_key);
    }
    
    msgobj.aes256decrypt = function (symmetric_key, cipher_text) {
        return wotmsg.aes256decrypt(symmetric_key, cipher_text);
    }
    
    msgobj.aes256encrypt = function (symmetric_key, data) {
        return wotmsg.aes256encrypt(symmetric_key, data);
    }
    
    msgobj.decrypt_ecdh = function (rcpt_private_key, rcpt_public_key, sender_public_key, jwe_input) {
        return wotmsg.decrypt_ecdh(rcpt_private_key, rcpt_public_key, sender_public_key, jwe_input);
    }
    
    msgobj.getpayload = function (msg) {
        return wotmsg.getpayload(msg);
    }
    
    msgobj.create_peermsg = function (data, notbuffer) {
        var message = {
            type: "PEERMSG",
            data: data
        };
        var strobj = JSON.stringify(message);
        if (notbuffer) {
            return strobj;
        }
        
        var buffer = new Buffer(strobj);
        return buffer;
    }
    
    msgobj.create_id = function () {
        var temp = uuid.v4().toString();
        var id = temp.replace(/-/g, '');
        return id;
    }
    
    msgobj.create_hash_id = function (data) {
        var hashid = nodecrypto.createHash('sha1').update(data).digest().toString('hex');
        return hashid;
    }
    
    return msgobj;

}(streembit.Message || {}, global.applogger, global.appevents));


module.exports = streembit.Message;