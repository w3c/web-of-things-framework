/*
 
This file is part of W3C Web-of-Things-Framework.

W3C Web-of-Things-Framework is an open source project to create an Internet of Things framework.
This program is free software: you can redistribute it and/or modify it under the terms of the GNU General Public License as published by 
the Free Software Foundation, either version 3 of the License, or (at your option) any later version.

W3C Web-of-Things-Framework is distributed in the hope that it will be useful, but WITHOUT ANY WARRANTY; without even the implied warranty of 
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the GNU General Public License for more details.

You should have received a copy of the GNU General Public License along with W3C Web-of-Things-Framework.  If not, see <http://www.gnu.org/licenses/>.
 
File created by Tibor Zsolt Pardi
 
Original source https://raw.githubusercontent.com/cryptocoinjs/ecdsa/master/lib/ecdsa.js 
 
Copyright (C) 2015 The W3C WoT Team
 
*/

var crypto = require('crypto')
var assert = require('assert')

var ecurve = require('./ecurve')
var Point = ecurve.Point
var BigInteger = require('bigi')

var util = require('./util')

//dropped support for all others
var curve = ecurve.getCurveByName('secp256k1')


/**
  * Calculate pubkey extraction parameter.
  *
  * When extracting a pubkey from a signature, we have to
  * distinguish four different cases. Rather than putting this
  * burden on the verifier, Bitcoin includes a 2-bit value with the
  * signature.
  *
  * This function simply tries all four cases and returns the value
  * that resulted in a successful pubkey recovery.
  */
function calcPubKeyRecoveryParam(e, signature, Q) {
    for (var i = 0; i < 4; i++) {
        var Qprime = recoverPubKey(e, signature, i)
        
        if (Qprime.equals(Q)) {
            return i
        }
    }
    
    throw new Error('Unable to find valid recovery factor')
}

function deterministicGenerateK(hash, D) {
    assert(Buffer.isBuffer(hash), 'Hash must be a Buffer, not ' + hash)
    assert.equal(hash.length, 32, 'Hash must be 256 bit')
    assert(BigInteger.isBigInteger(D, true), 'Private key must be a BigInteger')
    
    var x = D.toBuffer(32)
    var k = new Buffer(32)
    var v = new Buffer(32)
    k.fill(0)
    v.fill(1)
    
    k = util.hmacSHA256(Buffer.concat([v, new Buffer([0]), x, hash]), k)
    v = util.hmacSHA256(v, k)
    
    k = util.hmacSHA256(Buffer.concat([v, new Buffer([1]), x, hash]), k)
    v = util.hmacSHA256(v, k)
    v = util.hmacSHA256(v, k)
    
    var n = curve.n
    var kB = BigInteger.fromBuffer(v).mod(n)
    assert(kB.compareTo(BigInteger.ONE) > 0, 'Invalid k value')
    assert(kB.compareTo(curve.n) < 0, 'Invalid k value')
    
    return kB
}

function parseSig(buffer) {
    assert.equal(buffer.readUInt8(0), 0x30, 'Not a DER sequence')
    assert.equal(buffer.readUInt8(1), buffer.length - 2, 'Invalid sequence length')
    
    assert.equal(buffer.readUInt8(2), 0x02, 'Expected a DER integer')
    var rLen = buffer.readUInt8(3)
    var rB = buffer.slice(4, 4 + rLen)
    
    var offset = 4 + rLen
    assert.equal(buffer.readUInt8(offset), 0x02, 'Expected a DER integer (2)')
    var sLen = buffer.readUInt8(1 + offset)
    var sB = buffer.slice(2 + offset)
    offset += 2 + sLen
    
    assert.equal(offset, buffer.length, 'Invalid DER encoding')
    
    return { r: BigInteger.fromDERInteger(rB), s: BigInteger.fromDERInteger(sB) }
}

function parseSigCompact(buffer) {
    assert.equal(buffer.length, 65, 'Invalid signature length')
    var i = buffer.readUInt8(0) - 27
    
    // At most 3 bits
    assert.equal(i, i & 7, 'Invalid signature parameter')
    var compressed = !!(i & 4)
    
    // Recovery param only
    i = i & 3
    
    var r = BigInteger.fromBuffer(buffer.slice(1, 33))
    var s = BigInteger.fromBuffer(buffer.slice(33))
    
    return {
        signature: {
            r: r,
            s: s
        },
        i: i,
        compressed: compressed
    }
}

/**
  * Recover a public key from a signature.
  *
  * See SEC 1: Elliptic Curve Cryptography, section 4.1.6, "Public
  * Key Recovery Operation".
  *
  * http://www.secg.org/download/aid-780/sec1-v2.pdf
  */
function recoverPubKey(e, signature, i) {
    assert.strictEqual(i & 3, i, 'Recovery param is more than two bits')
    
    var n = curve.n
    var G = curve.G
    
    var r = signature.r
    var s = signature.s
    
    assert(r.signum() > 0 && r.compareTo(n) < 0, 'Invalid r value')
    assert(s.signum() > 0 && s.compareTo(n) < 0, 'Invalid s value')
    
    // A set LSB signifies that the y-coordinate is odd
    var isYOdd = i & 1
    
    // The more significant bit specifies whether we should use the
    // first or second candidate key.
    var isSecondKey = i >> 1
    
    // 1.1 Let x = r + jn
    var x = isSecondKey ? r.add(n) : r
    var R = curve.pointFromX(isYOdd, x)
    
    // 1.4 Check that nR is at infinity
    var nR = R.multiply(n)
    assert(curve.isInfinity(nR), 'nR is not a valid curve point')
    
    // Compute -e from e
    var eNeg = e.negate().mod(n)
    
    // 1.6.1 Compute Q = r^-1 (sR -  eG)
    //               Q = r^-1 (sR + -eG)
    var rInv = r.modInverse(n)
    
    var Q = R.multiplyTwo(s, G, eNeg).multiply(rInv)
    curve.validate(Q)
    
    return Q
}


function serializeSig(signature) {
    //var rBa = r.toByteArraySigned();
    //var sBa = s.toByteArraySigned();
    var rBa = signature.r.toDERInteger()
    var sBa = signature.s.toDERInteger()
    
    
    var sequence = [];
    sequence.push(0x02); // INTEGER
    sequence.push(rBa.length);
    sequence = sequence.concat(rBa);
    
    sequence.push(0x02); // INTEGER
    sequence.push(sBa.length);
    sequence = sequence.concat(sBa);
    
    sequence.unshift(sequence.length);
    sequence.unshift(0x30); // SEQUENCE
    
    return sequence;
}

function serializeSigCompact(signature, i, compressed) {
    if (compressed) {
        i += 4
    }
    
    i += 27
    
    var buffer = new Buffer(65)
    buffer.writeUInt8(i, 0)
    
    signature.r.toBuffer(32).copy(buffer, 1)
    signature.s.toBuffer(32).copy(buffer, 33)
    
    return buffer
}

function sign(hash, privateKey) {
    if (Buffer.isBuffer(privateKey))
        var D = BigInteger.fromBuffer(privateKey)
    else
        var D = privateKey//big integer for legacy compatiblity
    
    var k = deterministicGenerateK(hash, D)
    
    var n = curve.n
    var G = curve.G
    var Q = G.multiply(k)
    var e = BigInteger.fromBuffer(hash)
    
    var r = Q.affineX.mod(n)
    assert.notEqual(r.signum(), 0, 'Invalid R value')
    
    var s = k.modInverse(n).multiply(e.add(D.multiply(r))).mod(n)
    assert.notEqual(s.signum(), 0, 'Invalid S value')
    
    var N_OVER_TWO = n.shiftRight(1)
    
    // enforce low S values, see bip62: 'low s values in signatures'
    if (s.compareTo(N_OVER_TWO) > 0) {
        s = n.subtract(s)
    }
    
    return { r: r, s: s }
}

function verify(hash, signature, pubkey) {
    assert(signature.r && signature.s, "Invalid signature.")
    
    var Q;
    if (Buffer.isBuffer(pubkey)) {
        Q = Point.decodeFrom(curve, pubkey);
    } else {
        throw new Error("Invalid format for pubkey value, must be Buffer");
    }
    var e = BigInteger.fromBuffer(hash);
    
    return verifyRaw(e, { r: signature.r, s: signature.s }, Q)
}

function verifyRaw(e, signature, Q) {
    var n = curve.n
    var G = curve.G
    
    var r = signature.r
    var s = signature.s
    
    // 1.4.1 Enforce r and s are both integers in the interval [1, n − 1]
    if (r.signum() <= 0 || r.compareTo(n) >= 0) return false
    if (s.signum() <= 0 || s.compareTo(n) >= 0) return false
    
    // c = s^-1 mod n
    var c = s.modInverse(n)
    
    // 1.4.4 Compute u1 = es^−1 mod n
    //               u2 = rs^−1 mod n
    var u1 = e.multiply(c).mod(n)
    var u2 = r.multiply(c).mod(n)
    
    // 1.4.5 Compute R = (xR, yR) = u1G + u2Q
    var R = G.multiplyTwo(u1, Q, u2)
    var v = R.affineX.mod(n)
    
    // 1.4.5 (cont.) Enforce R is not at infinity
    if (curve.isInfinity(R)) return false
    
    // 1.4.8 If v = r, output "valid", and if v != r, output "invalid"
    return v.equals(r)
}

module.exports = {
    curve: curve,
    deterministicGenerateK: deterministicGenerateK,
    parseSig: parseSig,
    parseSigCompact: parseSigCompact,
    recoverPubKey: recoverPubKey,
    serializeSig: serializeSig,
    serializeSigCompact: serializeSigCompact,
    sign: sign,
    verify: verify,
    verifyRaw: verifyRaw
}

