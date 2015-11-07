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
var ecurve = require('./ecurve');
var ecparams = ecurve.getCurveByName('secp256k1');
var BigInteger = require('bigi');
var ecdsa = require('./EccDsa');

function EccKey(bytes, compressed) {
    if (!(this instanceof EccKey)) {
        return new EccKey(bytes, compressed)
    }

    if (typeof compressed == 'boolean')
        this._compressed = compressed
    else
        this._compressed = true
    
    if (bytes)
        this.privateKey = bytes
}


Object.defineProperty(EccKey.prototype, 'privateKey', {
    enumerable: true, configurable: true,
    get: function () {
        return this.key
    },
    set: function (bytes) {
        if (typeof bytes != 'string') {
            throw new Error("The private key input must be a string");
        }

        var byteArr;
        var hash = crypto.createHash('sha256').update(bytes).digest();
        if (Buffer.isBuffer(hash)) {
            this.key = hash;
            byteArr = [].slice.call(hash)
        }
        else {
            throw new Error('Error generating private key hash');
        }
        
        if (this.key.length != 32)
            throw new Error("private key bytes must have a length of 32")
        
        //_exportKey => privateKey + (0x01 if compressed)
        if (this._compressed)
            this._exportKey = Buffer.concat([ this.key, new Buffer([0x01]) ])
        else
            this._exportKey = Buffer.concat([ this.key ]) //clone key as opposed to passing a reference (relevant to Node.js only)
        
        this.keyBigInteger = BigInteger.fromByteArrayUnsigned(byteArr)
        
        //reset
        this._publicPoint = null
        this._pubKeyHash = null
    }
})

Object.defineProperty(EccKey.prototype, 'privateExportKey', {
    get: function () {
        return this._exportKey
    }
})


Object.defineProperty(EccKey.prototype, 'pubKeyHash', {
    get: function () {
        if (this._pubKeyHash) return this._pubKeyHash
        this._pubKeyHash = crypto.createHash('rmd160').update(this.publicKey).digest()
        return this._pubKeyHash
    }
})

Object.defineProperty(EccKey.prototype, 'publicKey', {
    get: function () {
        return new Buffer(this.publicPoint.getEncoded(this.compressed))
    }
})

Object.defineProperty(EccKey.prototype, 'publicPoint', {
    get: function () {
        if (!this._publicPoint) {
            this._publicPoint = ecparams.G.multiply(this.keyBigInteger)
        }
        return this._publicPoint
    }
})

Object.defineProperty(EccKey.prototype, 'compressed', {
    get: function () {
        return this._compressed
    }, 
    set: function (val) {
        var c = !!val
        if (c === this._compressed) return
        
        //reset key stuff
        var pk = this.privateKey
        this._compressed = c
        this.privateKey = pk
    }
})

Object.defineProperty(EccKey.prototype, 'publicKeyStr', {
    get: function () {
        return this.publicKey.toString('hex')
    }
})


EccKey.prototype.toString = function (format) {
    return this.privateKey.toString('hex')
}


EccKey.prototype.DecodePk = function(hexkey) {
    if (!hexkey || hexkey.constructor != String ) {
        throw new Error("Invalid KeyString decode paramater");
    }
    
    var buffer;
    try {
        buffer = new Buffer(hexkey, 'hex');
    }
    catch (err) {
        throw new Error('Encoding key failed. Error: ' + err);
    }

    return buffer;
}

EccKey.prototype.sign = function sign(text, account) {
    var buffer = new Buffer(text, "utf-8");
    var hash = crypto.createHash('sha256').update(buffer).digest();
    var signbuffer = ecdsa.sign(hash, this.privateKey);
    var ser1 = ecdsa.serializeSig(signbuffer);
    var ser2 = new Buffer(ser1);
    var signatureb64 = ser2.toString('base64');
    var hashstr = hash.toString('hex');
    var encodedKey = this.pubKeyEncode;
    return { hash: hashstr, signature: signatureb64, account: account, pkchecksum: encodedKey.checksum };
}

module.exports = EccKey;

