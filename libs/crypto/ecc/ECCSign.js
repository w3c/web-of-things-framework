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
var ecdsa = require('./EccDsa');

function EccSign(privateKey, input) {
    if (!privateKey || input == undefined) {
        throw new Error("Invalid EccSign parameters");
        return;
    }
    
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
        throw new Error("Invalid EccSign input parameter");
    }
    
    if (!text) {
        throw new Error("Invalid EccSign input parameter");
    }

    var buffer = new Buffer(text, "utf-8");
    var hash = crypto.createHash('sha256').update(buffer).digest();

    var signbuffer = ecdsa.sign(hash, privateKey);
    var ser1 = ecdsa.serializeSig(signbuffer);
    var ser2 = new Buffer(ser1);

    var signatureb64 = ser2.toString('base64');

    return signatureb64;
}

module.exports = EccSign;

