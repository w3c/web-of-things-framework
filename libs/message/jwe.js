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


var JWEHandler = (function () {
    var obj = {};

    obj.CRYPTOSYS = {
        ECC: 'ecc',
        RSA: 'rsa'
    };
    
    function create_symmetric_key(crypto_system, master_key, other_public_key) {
        if (crypto_system == obj.CRYPTOSYS.ECC) {
            var symmkey = master_key.computeSecret(other_public_key, 'hex', 'hex');
            return symmkey;
        }
        else {
            throw new Error("Crypto system is not supported: " + crypto_system);
        }
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
    
    obj.encrypt = function(crypto_system, master_key, other_public_key, data) {
        if (crypto_system == obj.CRYPTOSYS.ECC) {
            var secret = create_symmetric_key(crypto_system, master_key, other_public_key);
            var cipher = crypto.createCipher('aes256', secret);
            var cipher_text = cipher.update(data, 'utf8', 'base64');
            cipher_text += cipher.final('base64');
            
            //  Create a JWE structure by combining a JWE header and the cipher text
            //  Please note the A256KW in this implementation of WoT refers to the AES 256 algorithm and
            //  the key is not wrapped (as it is generated with Diffie-Hellman. The "KW" is kept to use a 
            //  standard value in the "enc" field.
            //  This implementation do not use a JWE Encrypted Key - the symmetric encryption key is a
            //  Diffie-Hellman key exchange secret. For increased security and fully comply with JWE standard
            //  future implementations could use a JWE Encrypted session key
            var header = { "alg": "ECDH-ES", "enc": "A256KW" };
            var segments = [];
            segments.push(base64urlEncode(JSON.stringify(header)));
            // the cipher is already Base64 encoded, only need to URL escape
            segments.push(base64urlEscape(cipher_text));            
            var result = segments.join('.');
            
            return result;
        }
        else {
            throw new Error("Crypto system is not supported: " + crypto_system);
        }
    }
    
    obj.decrypt = function (master_key, other_public_key, jwe_input) {
        //  Parse the JWE structure
        //  The input must include at least two Base64 encoded segments divided by a a "." as
        //  per the JWE standard definition
        var segments = jwe_input.split('.');
        if (segments.length !== 2) {
            throw new Error('JWE parse error: invalid segment count');
        }
        
        // All segment should be base64
        var headerSeg = segments[0];
        var cipherSeg = segments[1];
        
        // base64 decode and parse JSON
        var header = JSON.parse(base64urlDecode(headerSeg));
        //  The payload was only URL escaped, see above the encryption method, need to URL unescape it
        var cipher_text = base64urlUnescape(cipherSeg);        
        
        if (!header || !header.alg) {
            throw new Error('JWE parse error: invalid header alg field');
        }
        
        if (header.alg.indexOf("ECDH") > -1) {
            var secret = create_symmetric_key(obj.CRYPTOSYS.ECC, master_key, other_public_key);
            
            var decipher = crypto.createDecipher('aes256', secret);
            var plain_text = decipher.update(cipher_text, 'base64', 'utf8');
            plain_text += decipher.final();
            
            return plain_text;
        }
        else {
            //  TODO implement here the support for RSA
            throw new Error("Invalid crypto alg. Only ECDH is supported on this version of WOT");
        }
    }
    

    return obj;
}());


module.exports = {
    handler: JWEHandler
}