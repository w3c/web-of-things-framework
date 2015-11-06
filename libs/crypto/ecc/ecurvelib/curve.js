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


var BigInteger = require('bigi')

var ECFieldElementFp = require('./field-element')
var ECPointFp = require('./point')

module.exports = ECCurveFp

function ECCurveFp(q,a,b) {
  this._q = q;
  this._a = this.fromBigInteger(a);
  this._b = this.fromBigInteger(b);
  this.infinity = new ECPointFp(this, null, null);
};

Object.defineProperty(ECCurveFp.prototype, 'q', {get: function() { return this._q}})
Object.defineProperty(ECCurveFp.prototype, 'a', {get: function() { return this._a}})
Object.defineProperty(ECCurveFp.prototype, 'b', {get: function() { return this._b}})

ECCurveFp.prototype.equals = function(other) {
  if(other == this) return true;
  return(this.q.equals(other.q) && this.a.equals(other.a) && this.b.equals(other.b));
};

ECCurveFp.prototype.getInfinity = function() {
  return this.infinity;
};

ECCurveFp.prototype.fromBigInteger = function(x) {
  return new ECFieldElementFp(this.q, x);
};

