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


var crypto = require('crypto');
var assert = require('assert');

function encode(payload) {
    if (!payload || !Buffer.isBuffer(payload)) {
        throw new Error("Invalid KeyString encode paramater");
    }
    var chksum = sha256x2(payload).slice(0, 4);
    var result = {
        key: payload.toString('hex'),
        checksum: chksum.toString('hex')
    };
    return result;
}

function decode(hexkey, checksum) {
    if (!hexkey || !checksum || hexkey.constructor != String || checksum.constructor != String) {
        throw new Error("Invalid KeyString decode paramater");
    }
    
    var buffer, newChecksum;
    try {
        buffer = new Buffer(hexkey, 'hex');
        newChecksum = sha256x2(buffer).slice(0, 4)
    }
    catch (err) {
        throw new Error('Encoding key failed. Error: ' + err);
    }

    if (checksum !== newChecksum.toString('hex'))
        throw new Error('Invalid checksum')
    
    return buffer;
}

function isValid(hexkey, checksum) {
    try {
        decode(hexkey, checksum)
    } catch (e) {
        return false
    }    
    return true;
}


function sha256x2(buffer) {
    var sha = crypto.createHash('sha256').update(buffer).digest()
    return crypto.createHash('sha256').update(sha).digest()
}

module.exports = {
    encode: encode,
    decode: decode,
    isValid: isValid
}