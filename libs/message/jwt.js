/*
 
This file is part of W3C Web-of-Things-Framework.

W3C Web-of-Things-Framework is an open source project to create an Internet of Things framework.
This program is free software: you can redistribute it and/or modify it under the terms of the GNU General Public License as published by 
the Free Software Foundation, either version 3 of the License, or (at your option) any later version.

W3C Web-of-Things-Framework is distributed in the hope that it will be useful, but WITHOUT ANY WARRANTY; without even the implied warranty of 
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the GNU General Public License for more details.

You should have received a copy of the GNU General Public License along with W3C Web-of-Things-Framework.  If not, see <http://www.gnu.org/licenses/>.
 
File created by Tibor Zsolt Pardi

https://github.com/hokaccha/node-jwt-simple/blob/master/lib/jwt.js
 
Copyright (C) 2015 The W3C WoT Team
 
*/


var crypto = require('crypto');
var eccsign = require('../../libs/crypto/ecc/EccSign');
var eccverify = require('../../libs/crypto/ecc/EccVerify');

var ECC_ALG = "ECC";
var RSA_ALG = "RSA";

var algorithmMap = {
    ES256: ECC_ALG, 
    ES384: ECC_ALG, 
    ES512: ECC_ALG
};



var jwt = module.exports;

jwt.decode = function decode(token, key) {
    // check token
    if (!token) {
        throw new Error('JWT decode error: no token supplied');
    }
    // check segments
    var segments = token.split('.');
    if (segments.length !== 3) {
        throw new Error('JWT decode error: invalid segment count');
    }
    
    // All segment should be base64
    var headerSeg = segments[0];
    var payloadSeg = segments[1];
    var signatureSeg = segments[2];
    
    // base64 decode and parse JSON
    var header = JSON.parse(base64urlDecode(headerSeg));
    var payload = JSON.parse(base64urlDecode(payloadSeg));    
    
    if (!header.alg) {
        throw new Error('Invalid JWT header alg parameter');
    }

    var signingCrypto = algorithmMap[header.alg];
    if (!signingCrypto ) {
        throw new Error('JWT algorithm ' + header.alg + ' is not supported');
    }
        
    // verify signature. 
    var signbase64 = base64urlUnescape(signatureSeg);
    var signingInput = [headerSeg, payloadSeg].join('.');
    if (!verify(signingCrypto, signingInput, key, signbase64)) {
        throw new Error('JWT signature verification failed');
    }    
    
    return payload;
};


jwt.parse = function decode(token) {
    // check token
    if (!token) {
        throw new Error('JWT parse error: no token supplied');
    }
    // check segments
    var segments = token.split('.');
    if (segments.length !== 3) {
        throw new Error('JWT parse error: invalid segment count');
    }
    
    // All segment should be base64
    var headerSeg = segments[0];
    var payloadSeg = segments[1];
    var signatureSeg = segments[2];
    
    // base64 decode and parse JSON
    var header = JSON.parse(base64urlDecode(headerSeg));
    var payload = JSON.parse(base64urlDecode(payloadSeg));
    var signbase64 = base64urlUnescape(signatureSeg);
    
    return [header, payload, signbase64];
};



jwt.encode = function encode(payload, key, options) {
    // Check key
    if (!key) {
        throw new Error('JWT encode error: key parameter is missing');
    }
    
    // Check algorithm, default is ES256
    var algorithm = (options && options.algorithm) ? options.algorithm : 'ES256';
    
    var signingCrypto = algorithmMap[algorithm];
    if (!signingCrypto ) {
        throw new Error('JWT encode error: algorithm ' + algorithm + ' is not supported');
    }
    
    // header, typ is fixed value.
    var header = { typ: 'JWT', alg: algorithm };
    
    var timestamp = Math.floor(Date.now() / 1000);
    if (!options.noTimestamp) {
        payload.iat = payload.iat || timestamp;
    }
    
    if (options.expires) {
        if (typeof options.expires === 'number') { // must be in seconds
            payload.exp = timestamp + options.expires;
        }
        else {
            throw new Error('JWT encode error: expires must be a number of seconds');
        }
    }

    if (options.audience) {
        payload.aud = options.audience;
    }
    
    if (options.issuer) {
        payload.iss = options.issuer;
    }
    
    if (options.subject) {
        payload.sub = options.subject;
    }
    
    if (options.subject) {
        payload.sub = options.subject;
    }

    // create segments, all segments should be base64 string
    var segments = [];
    segments.push(base64urlEncode(JSON.stringify(header)));
    segments.push(base64urlEncode(JSON.stringify(payload)));

    var input = segments.join('.');
    var signature = sign(signingCrypto, input, key);
    segments.push(signature);
    
    return segments.join('.');
};

jwt.get_message_payload = function (msg) {
    var segments = msg.split('.');
    if (segments.length !== 3) {
        throw new Error('JWT decode error: invalid segment count');
    }
    
    // All segment should be base64
    var payloadSeg = segments[1];
    var payload = JSON.parse(base64urlDecode(payloadSeg));    
    
    return payload;
}



function verify(crypto, input, public_key, signature) {
    var valid = false;
    try {
        if (crypto === ECC_ALG) {
            valid = eccverify(public_key, input, signature);
        }
        else {
            throw new Error('JWT verify error: algorithm type not recognized');
        }
    }
    catch (err) {
        throw new Error("JWT verify error:: " + err.message)
    }

    return valid;
}

function sign(crypto, input, key) {
    var base64str;
    try {
        if (crypto === ECC_ALG) {
            base64str = eccsign(key, input);
        }
        else {
            throw new Error('Algorithm type not recognized');
        }
    }
    catch (err) {
        throw new Error("Error in JWT signing: " +  err.message )
    }
    
    return base64urlEscape(base64str);
}

function base64urlDecode(str) {
    return new Buffer(base64urlUnescape(str), 'base64').toString();
}

function base64urlUnescape(str) {
    str += new Array(5 - str.length % 4).join('=');
    return str.replace(/\-/g, '+').replace(/_/g, '/');
}

function base64urlEncode(str) {
    return base64urlEscape(new Buffer(str).toString('base64'));
}

function base64urlEscape(str) {
    return str.replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
}