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



module.exports = ECFieldElementFp

function ECFieldElementFp(q,x) {
  this.x = x;
  // TODO if(x.compareTo(q) >= 0) error
  this.q = q;
};

ECFieldElementFp.prototype.equals = function(other) {
  if(other == this) return true;
  return (this.q.equals(other.q) && this.x.equals(other.x));
};

ECFieldElementFp.prototype.toBigInteger = function() {
  return this.x;
};

ECFieldElementFp.prototype.negate = function() {
  return new ECFieldElementFp(this.q, this.x.negate().mod(this.q));
};

ECFieldElementFp.prototype.add = function(b) {
  return new ECFieldElementFp(this.q, this.x.add(b.toBigInteger()).mod(this.q));
};

ECFieldElementFp.prototype.subtract = function(b) {
  return new ECFieldElementFp(this.q, this.x.subtract(b.toBigInteger()).mod(this.q));
};

ECFieldElementFp.prototype.multiply = function(b) {
  return new ECFieldElementFp(this.q, this.x.multiply(b.toBigInteger()).mod(this.q));
};

ECFieldElementFp.prototype.square = function() {
  return new ECFieldElementFp(this.q, this.x.square().mod(this.q));
};

ECFieldElementFp.prototype.divide = function feFpDivide(b) {
  return new ECFieldElementFp(this.q, this.x.multiply(b.toBigInteger().modInverse(this.q)).mod(this.q));
};

ECFieldElementFp.prototype.getByteLength = function () {
  return Math.floor((this.toBigInteger().bitLength() + 7) / 8);
};