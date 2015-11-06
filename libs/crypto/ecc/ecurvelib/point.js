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


var assert = require('assert')

var BigInteger = require('bigi')

module.exports = ECPointFp


function ECPointFp(curve,x,y,z) {
    this.curve = curve;
    this.x = x;
    this.y = y;
    // Projective coordinates: either zinv == null or z * zinv == 1
    // z and zinv are just BigIntegers, not fieldElements
    if(z == null) {
        this.z = BigInteger.ONE;
    }
    else {
        this.z = z;
    }

    this.zinv = null;
    this.compressed = true
};

ECPointFp.prototype.getX = function() {
  if(this.zinv == null) {
    this.zinv = this.z.modInverse(this.curve.q);
  }
  return this.curve.fromBigInteger(this.x.toBigInteger().multiply(this.zinv).mod(this.curve.q));
};

ECPointFp.prototype.getY = function() {
  if(this.zinv == null) {
    this.zinv = this.z.modInverse(this.curve.q);
  }
  return this.curve.fromBigInteger(this.y.toBigInteger().multiply(this.zinv).mod(this.curve.q));
};

ECPointFp.prototype.equals = function(other) {
  if(other == this) return true;
  if(this.isInfinity()) return other.isInfinity();
  if(other.isInfinity()) return this.isInfinity();
  var u, v;
  // u = Y2 * Z1 - Y1 * Z2
  u = other.y.toBigInteger().multiply(this.z).subtract(this.y.toBigInteger().multiply(other.z)).mod(this.curve.q);
  if(!u.equals(BigInteger.ZERO)) return false;
  // v = X2 * Z1 - X1 * Z2
  v = other.x.toBigInteger().multiply(this.z).subtract(this.x.toBigInteger().multiply(other.z)).mod(this.curve.q);
  return v.equals(BigInteger.ZERO);
};

ECPointFp.prototype.isInfinity = function() {
  if((this.x == null) && (this.y == null)) return true;
  return this.z.equals(BigInteger.ZERO) && !this.y.toBigInteger().equals(BigInteger.ZERO);
};

ECPointFp.prototype.negate = function() {
  return new ECPointFp(this.curve, this.x, this.y.negate(), this.z);
};

ECPointFp.prototype.add = function(b) {
  if(this.isInfinity()) return b;
  if(b.isInfinity()) return this;

  // u = Y2 * Z1 - Y1 * Z2
  var u = b.y.toBigInteger().multiply(this.z).subtract(this.y.toBigInteger().multiply(b.z)).mod(this.curve.q);
  // v = X2 * Z1 - X1 * Z2
  var v = b.x.toBigInteger().multiply(this.z).subtract(this.x.toBigInteger().multiply(b.z)).mod(this.curve.q);

  if(BigInteger.ZERO.equals(v)) {
    if(BigInteger.ZERO.equals(u)) {
      return this.twice(); // this == b, so double
    }
    return this.curve.getInfinity(); // this = -b, so infinity
  }

  var THREE = new BigInteger("3");
  var x1 = this.x.toBigInteger();
  var y1 = this.y.toBigInteger();
  var x2 = b.x.toBigInteger();
  var y2 = b.y.toBigInteger();

  var v2 = v.square();
  var v3 = v2.multiply(v);
  var x1v2 = x1.multiply(v2);
  var zu2 = u.square().multiply(this.z);

  // x3 = v * (z2 * (z1 * u^2 - 2 * x1 * v^2) - v^3)
  var x3 = zu2.subtract(x1v2.shiftLeft(1)).multiply(b.z).subtract(v3).multiply(v).mod(this.curve.q);
  // y3 = z2 * (3 * x1 * u * v^2 - y1 * v^3 - z1 * u^3) + u * v^3
  var y3 = x1v2.multiply(THREE).multiply(u).subtract(y1.multiply(v3)).subtract(zu2.multiply(u)).multiply(b.z).add(u.multiply(v3)).mod(this.curve.q);
  // z3 = v^3 * z1 * z2
  var z3 = v3.multiply(this.z).multiply(b.z).mod(this.curve.q);

  return new ECPointFp(this.curve, this.curve.fromBigInteger(x3), this.curve.fromBigInteger(y3), z3);
};

ECPointFp.prototype.twice = function() {
  if(this.isInfinity()) return this;
  if(this.y.toBigInteger().signum() == 0) return this.curve.getInfinity();

  // TODO: optimized handling of constants
  var THREE = new BigInteger("3");
  var x1 = this.x.toBigInteger();
  var y1 = this.y.toBigInteger();

  var y1z1 = y1.multiply(this.z);
  var y1sqz1 = y1z1.multiply(y1).mod(this.curve.q);
  var a = this.curve.a.toBigInteger();

  // w = 3 * x1^2 + a * z1^2
  var w = x1.square().multiply(THREE);
  if(!BigInteger.ZERO.equals(a)) {
    w = w.add(this.z.square().multiply(a));
  }
  w = w.mod(this.curve.q);
  // x3 = 2 * y1 * z1 * (w^2 - 8 * x1 * y1^2 * z1)
  var x3 = w.square().subtract(x1.shiftLeft(3).multiply(y1sqz1)).shiftLeft(1).multiply(y1z1).mod(this.curve.q);
  // y3 = 4 * y1^2 * z1 * (3 * w * x1 - 2 * y1^2 * z1) - w^3
  var y3 = w.multiply(THREE).multiply(x1).subtract(y1sqz1.shiftLeft(1)).shiftLeft(2).multiply(y1sqz1).subtract(w.square().multiply(w)).mod(this.curve.q);
  // z3 = 8 * (y1 * z1)^3
  var z3 = y1z1.square().multiply(y1z1).shiftLeft(3).mod(this.curve.q);

  return new ECPointFp(this.curve, this.curve.fromBigInteger(x3), this.curve.fromBigInteger(y3), z3);
};

// Simple NAF (Non-Adjacent Form) multiplication algorithm
// TODO: modularize the multiplication algorithm
ECPointFp.prototype.multiply = function(k) {
  if(this.isInfinity()) return this;
  if(k.signum() == 0) return this.curve.getInfinity();

  var e = k;
  var h = e.multiply(new BigInteger("3"));

  var neg = this.negate();
  var R = this;

  var i;
  for(i = h.bitLength() - 2; i > 0; --i) {
    R = R.twice();

    var hBit = h.testBit(i);
    var eBit = e.testBit(i);

    if (hBit != eBit) {
      R = R.add(hBit ? this : neg);
    }
  }

  return R;
};

// Compute this*j + x*k (simultaneous multiplication)
ECPointFp.prototype.multiplyTwo = function(j,x,k) {
  var i;
  if(j.bitLength() > k.bitLength()) {
    i = j.bitLength() - 1;
  } else {
    i = k.bitLength() - 1;
  }

  var R = this.curve.getInfinity();
  var both = this.add(x);
  while(i >= 0) {
    R = R.twice();
    if(j.testBit(i)) {
      if(k.testBit(i)) {
        R = R.add(both);
      } else {
        R = R.add(this);
      }
    } else {
      if(k.testBit(i)) {
        R = R.add(x);
      }
    }
    --i;
  }

  return R;
};

ECPointFp.prototype.getEncoded = function(doCompress) {
  if (this.isInfinity()) return [0]; // Infinity point encoded is simply '00'
  var x = this.getX().toBigInteger();
  var y = this.getY().toBigInteger();

  var compressed = this.compressed
  if (typeof doCompress == 'boolean')
    compressed = doCompress

  // Determine size of q in bytes
  var byteLength = Math.floor((this.curve.q.bitLength() + 7) / 8);

  // Get value as a 32-byte Buffer
  // Fixed length based on a patch by bitaddress.org and Casascius
  var enc = [].slice.call(x.toBuffer(byteLength))

  if (compressed) {
    if (y.isEven()) {
      // Compressed even pubkey
      // M = 02 || X
      enc.unshift(0x02);
    } else {
      // Compressed uneven pubkey
      // M = 03 || X
      enc.unshift(0x03);
    }
  } else {
    // Uncompressed pubkey
    // M = 04 || X || Y
    enc.unshift(0x04);
    enc = enc.concat([].slice.call(y.toBuffer(byteLength)))
  }
  return new Buffer(enc);
};

ECPointFp.decodeFrom = function(curve, buffer) {
  var type = buffer.readUInt8(0);
  var compressed = (type !== 4)
  var x = BigInteger.fromBuffer(buffer.slice(1, 33))
  var y = null

  if (compressed) {
    assert.equal(buffer.length, 33, 'Invalid sequence length')
    assert(type === 0x02 || type === 0x03, 'Invalid sequence tag')

    var isYEven = (type === 0x02)
    var a = curve.a.toBigInteger()
    var b = curve.b.toBigInteger()
    var p = curve.q

    // We precalculate (p + 1) / 4 where p is the field order
    if (!curve.P_OVER_FOUR) {
      curve.P_OVER_FOUR = p.add(BigInteger.ONE).shiftRight(2)
    }

    // Convert x to point
    var alpha = x.pow(3).add(a.multiply(x)).add(b).mod(p)
    var beta = alpha.modPow(curve.P_OVER_FOUR, p)

    // If beta is even, but y isn't, or vice versa, then convert it,
    // otherwise we're done and y == beta.
    y = (beta.isEven() ^ isYEven) ? p.subtract(beta) : beta

  } else {
    assert.equal(buffer.length, 65, 'Invalid sequence length')

    y = BigInteger.fromBuffer(buffer.slice(33))
  }

  var pt = new ECPointFp(curve, curve.fromBigInteger(x), curve.fromBigInteger(y));
  pt.compressed = compressed
  return pt
};

ECPointFp.prototype.isOnCurve = function () {
  if (this.isInfinity()) return true;
  var x = this.getX().toBigInteger();
  var y = this.getY().toBigInteger();
  var a = this.curve.a.toBigInteger();
  var b = this.curve.b.toBigInteger();
  var n = this.curve.q;
  var lhs = y.multiply(y).mod(n);
  var rhs = x.multiply(x).multiply(x)
  .add(a.multiply(x)).add(b).mod(n);
  return lhs.equals(rhs);
};

ECPointFp.prototype.toString = function () {
  if (this.isInfinity()) return '(INFINITY)';
  return '('+this.getX().toBigInteger().toString()+','+
  this.getY().toBigInteger().toString()+')';
};

/**
 * Validate an elliptic curve point.
 *
 * See SEC 1, section 3.2.2.1: Elliptic Curve Public Key Validation Primitive
 */
ECPointFp.prototype.validate = function () {
  var n = this.curve.q;

  // Check Q != O
  if (this.isInfinity()) {
    throw new Error("Point is at infinity.");
  }

  // Check coordinate bounds
  var x = this.getX().toBigInteger();
  var y = this.getY().toBigInteger();
  if (x.compareTo(BigInteger.ONE) < 0 ||
    x.compareTo(n.subtract(BigInteger.ONE)) > 0) {
    throw new Error('x coordinate out of bounds');
  }
  if (y.compareTo(BigInteger.ONE) < 0 ||
    y.compareTo(n.subtract(BigInteger.ONE)) > 0) {
    throw new Error('y coordinate out of bounds');
  }

  // Check y^2 = x^3 + ax + b (mod n)
  if (!this.isOnCurve()) {
    throw new Error("Point is not on the curve.");
  }

  // Check nQ = 0 (Q is a scalar multiple of G)
  if (this.multiply(n).isInfinity()) {
  // TODO: This check doesn't work - fix.
    throw new Error("Point is not a scalar multiple of G.");
  }

  return true;
};