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


var ecdsa = require('./EccDsa');
var ks = require('./KeyString');

function EccVerify(base64Pk, checksum, hash, signature, pk_checksum) {
    if (!base64Pk || !checksum) {
        throw new Error("Invalid contract verify parameters");
        return;
    }
    if (!hash) {
        throw new Error("Invalid transaction hash buffer");
        return;
    }
    if (!signature) {
        throw new Error("Invalid transaction signature buffer");
        return;
    }
    if (!pk_checksum) {
        throw new Error("Invalid transaction public key checksum buffer");
        return;
    }
    
    if (checksum != pk_checksum) {
        throw new Error("Public key checksums do not match ");
        return;
    }
    
    var msghash = new Buffer(hash, 'hex');

    //var signBuffer = new Buffer(signature, 'hex');    
    var signBuffer = null;
    try {
        signBuffer = new Buffer(signature, 'base64');
    }
    catch (e) {
        signBuffer = null;
    }
    if (!signBuffer) {
        throw new Error("Invalid signature buffer.");
        return;
    }

    var signature = ecdsa.parseSig(signBuffer);
    
    var publickey = ks.decode(base64Pk, checksum);
    var valid = ecdsa.verify(msghash, signature, publickey);
    return valid;
}

module.exports = EccVerify;

