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
var assert = require('assert');

var ecurve = require('./ecurvelib/index');
var ECPointFp = ecurve.ECPointFp;
var BigInteger = require('bigi');

module.exports = (function () {
    var _ecparams = ecurve.getECParams('secp256k1');
    var methods = {
        hmacSHA256: hmacSHA256,
        calcPubKeyRecoveryParam: calcPubKeyRecoveryParam, deterministicGenerateK: deterministicGenerateK,
        recoverPubKey: recoverPubKey, sign: sign, verify: verify, verifyRaw: verifyRaw
    }
    
    function attachECParams(ecdsa, ecparams) {
        Object.keys(methods).forEach(function (method) {
            ecdsa[method] = methods[method].bind(null, ecparams);
        })
    }
    
    function _ecdsa(curveName) {
        if (!curveName)
            var ecparams = ecurve.getECParams('secp256k1')
        else
            var ecparams = ecurve.getECParams(curveName)
        
        var ecdsa = {}
        //attach other non-ecparams functions
        Object.keys(_ecdsa).forEach(function (k) {
            ecdsa[k] = _ecdsa[k]
        })
        
        ecdsa.ecparams = ecparams
        attachECParams(ecdsa, ecparams)
        
        return ecdsa
    }
    
    //attach ecparams
    _ecdsa.ecparams = _ecparams
    
    //attach functions
    _ecdsa.parseSig = parseSig
    _ecdsa.parseSigCompact = parseSigCompact
    _ecdsa.serializeSig = serializeSig
    _ecdsa.serializeSigCompact = serializeSigCompact
    
    attachECParams(_ecdsa, _ecparams)
    
    return _ecdsa
})();



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
function hmacSHA256(v, k) {
    return crypto.createHmac('sha256', k).update(v).digest()
}

function calcPubKeyRecoveryParam(ecparams, e, signature, Q) {
    for (var i = 0; i < 4; i++) {
        var Qprime = recoverPubKey(ecparams, e, signature, i)
        
        if (Qprime.equals(Q)) {
            return i
        }
    }
    
    throw new Error('Unable to find valid recovery factor')
}

function deterministicGenerateK(ecparams, hash, D) {
    assert(Buffer.isBuffer(hash), 'Hash must be a Buffer, not ' + hash)
    assert.equal(hash.length, 32, 'Hash must be 256 bit')
    assert(BigInteger.isBigInteger(D, true), 'Private key must be a BigInteger')
    
    var x = D.toBuffer(32);
    var k = new Buffer(32);
    var v = new Buffer(32);
    k.fill(0);
    v.fill(1);
    
    k = hmacSHA256(Buffer.concat([v, new Buffer([0]), x, hash]), k);
    v = hmacSHA256(v, k);
    
    k = hmacSHA256(Buffer.concat([v, new Buffer([1]), x, hash]), k);
    v = hmacSHA256(v, k);
    v = hmacSHA256(v, k);
    
    var n = ecparams.n;
    var kB = BigInteger.fromBuffer(v).mod(n);
    assert(kB.compareTo(BigInteger.ONE) > 0, 'Invalid k value');
    assert(kB.compareTo(ecparams.n) < 0, 'Invalid k value');
    
    return kB;
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
function recoverPubKey(ecparams, e, signature, i) {
    assert.strictEqual(i & 3, i, 'The recovery param is more than two bits')
    
    var r = signature.r
    var s = signature.s
    
    // A set LSB signifies that the y-coordinate is odd
    // By reduction, the y-coordinate is even if it is clear
    var isYEven = !(i & 1)
    
    // The more significant bit specifies whether we should use the
    // first or second candidate key.
    var isSecondKey = i >> 1
    
    var n = ecparams.n
    var G = ecparams.g
    var curve = ecparams.curve
    var p = curve.q
    var a = curve.a.toBigInteger()
    var b = curve.b.toBigInteger()
    
    // We precalculate (p + 1) / 4 where p is the field order
    if (!curve.P_OVER_FOUR) {
        curve.P_OVER_FOUR = p.add(BigInteger.ONE).shiftRight(2)
    }
    
    // 1.1 Compute x
    var x = isSecondKey ? r.add(n) : r
    
    // 1.3 Convert x to point
    var alpha = x.pow(3).add(a.multiply(x)).add(b).mod(p)
    var beta = alpha.modPow(curve.P_OVER_FOUR, p)
    
    // If beta is even, but y isn't, or vice versa, then convert it,
    // otherwise we're done and y == beta.
    var y = (beta.isEven() ^ isYEven) ? p.subtract(beta) : beta
    
    // 1.4 Check that nR isn't at infinity
    var R = new ECPointFp(curve, curve.fromBigInteger(x), curve.fromBigInteger(y))
    R.validate()
    
    // 1.5 Compute -e from e
    var eNeg = e.negate().mod(n)
    
    // 1.6 Compute Q = r^-1 (sR -  eG)
    //             Q = r^-1 (sR + -eG)
    var rInv = r.modInverse(n)
    
    var Q = R.multiplyTwo(s, G, eNeg).multiply(rInv)
    Q.validate()
    
    if (!verifyRaw(ecparams, e, signature, Q)) {
        throw new Error("Pubkey recovery unsuccessful")
    }
    
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

function sign(ecparams, hash, privateKey) {
    if (Buffer.isBuffer(privateKey))
        var D = BigInteger.fromBuffer(privateKey)
    else
        var D = privateKey//big integer for legacy compatiblity
    
    var k = deterministicGenerateK(ecparams, hash, D)
    
    var n = ecparams.n
    var G = ecparams.g
    var Q = G.multiply(k)
    var e = BigInteger.fromBuffer(hash)
    
    var r = Q.getX().toBigInteger().mod(n)
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

function verify(ecparams, hash, signature, pubkey) {
    assert(signature.r && signature.s, "Invalid signature.")
    
    var Q;
    if (Buffer.isBuffer(pubkey)) {
        Q = ECPointFp.decodeFrom(ecparams.curve, pubkey);
    } else {
        throw new Error("Invalid format for pubkey value, must be Buffer");
    }
    var e = BigInteger.fromBuffer(hash);
    
    return verifyRaw(ecparams, e, { r: signature.r, s: signature.s }, Q);
}

function verifyRaw(ecparams, e, signature, Q) {
    var n = ecparams.n
    var G = ecparams.g
    
    var r = signature.r
    var s = signature.s
    
    if (r.signum() === 0 || r.compareTo(n) >= 0) return false
    if (s.signum() === 0 || s.compareTo(n) >= 0) return false
    
    var c = s.modInverse(n)
    
    var u1 = e.multiply(c).mod(n)
    var u2 = r.multiply(c).mod(n)
    
    var point = G.multiplyTwo(u1, Q, u2)
    var v = point.getX().toBigInteger().mod(n)
    
    return v.equals(r)
}