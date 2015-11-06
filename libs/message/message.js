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


function WoTMessage(private_key, payload, options) {
    if (!(this instanceof WoTMessage)) {
        return new WoTMessage(private_key, payload, options);
    }
    
    if (!options || !options.alg) {
        //  default algorithm is ECC
        options.alg = 'ECC';     
    }
    
    // currently only ECC is supported    
    assert(options.alg == "ECC", "In this version only elliptic  curve cryptography algorithms supported");
    
    // TODO create a json web token
    return payload;    
}

WoTMessage.prototype.verify = function (public_key, message) {
       
    return true;
}

module.exports = WoTMessage;
