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


var BigInteger = require('bigi');

var ECCurveFp = require('./curve');
var ECPointFp = require('./point')


// Named EC curves

// ----------------
// X9ECParameters

// constructor
function X9ECParameters(curve,g,n,h) {
  this._curve = curve;
  this._g = g;
  this._n = n;
  this._h = h;
}

Object.defineProperty(X9ECParameters.prototype, 'curve', {get: function() { return this._curve }})
Object.defineProperty(X9ECParameters.prototype, 'g', {get: function() { return this._g }})
Object.defineProperty(X9ECParameters.prototype, 'n', {get: function() { return this._n }})
Object.defineProperty(X9ECParameters.prototype, 'h', {get: function() { return this._h }})


// ----------------
// SECNamedCurves

function fromHex(s) { return new BigInteger(s, 16); }

var namedCurves = {
  secp128r1: function() {
    // p = 2^128 - 2^97 - 1
    var p = fromHex("FFFFFFFDFFFFFFFFFFFFFFFFFFFFFFFF");
    var a = fromHex("FFFFFFFDFFFFFFFFFFFFFFFFFFFFFFFC");
    var b = fromHex("E87579C11079F43DD824993C2CEE5ED3");
    //byte[] S = Hex.decode("000E0D4D696E6768756151750CC03A4473D03679");
    var n = fromHex("FFFFFFFE0000000075A30D1B9038A115");
    var h = BigInteger.ONE;
    var curve = new ECCurveFp(p, a, b);
    /*var G = curve.decodePointHex("04"
      + "161FF7528B899B2D0C28607CA52C5B86"
      + "CF5AC8395BAFEB13C02DA292DDED7A83");*/

    var x = BigInteger.fromHex("161FF7528B899B2D0C28607CA52C5B86")
    var y =  BigInteger.fromHex("CF5AC8395BAFEB13C02DA292DDED7A83")
    var G = new ECPointFp(curve, curve.fromBigInteger(x), curve.fromBigInteger(y))

    return new X9ECParameters(curve, G, n, h);
  },
  
  secp160k1: function() {
    // p = 2^160 - 2^32 - 2^14 - 2^12 - 2^9 - 2^8 - 2^7 - 2^3 - 2^2 - 1
    var p = fromHex("FFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFEFFFFAC73");
    var a = BigInteger.ZERO;
    var b = fromHex("7");
    //byte[] S = null;
    var n = fromHex("0100000000000000000001B8FA16DFAB9ACA16B6B3");
    var h = BigInteger.ONE;
    var curve = new ECCurveFp(p, a, b);
    /*var G = curve.decodePointHex("04"
      + "3B4C382CE37AA192A4019E763036F4F5DD4D7EBB"
      + "938CF935318FDCED6BC28286531733C3F03C4FEE");*/
    
    var x = BigInteger.fromHex("3B4C382CE37AA192A4019E763036F4F5DD4D7EBB")
    var y =  BigInteger.fromHex("938CF935318FDCED6BC28286531733C3F03C4FEE")
    var G = new ECPointFp(curve, curve.fromBigInteger(x), curve.fromBigInteger(y))

    return new X9ECParameters(curve, G, n, h);
  },
  
  secp160r1: function() {
    // p = 2^160 - 2^31 - 1
    var p = fromHex("FFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF7FFFFFFF");
    var a = fromHex("FFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF7FFFFFFC");
    var b = fromHex("1C97BEFC54BD7A8B65ACF89F81D4D4ADC565FA45");
    //byte[] S = Hex.decode("1053CDE42C14D696E67687561517533BF3F83345");
    var n = fromHex("0100000000000000000001F4C8F927AED3CA752257");
    var h = BigInteger.ONE;
    var curve = new ECCurveFp(p, a, b);
    /*var G = curve.decodePointHex("04"
      + "4A96B5688EF573284664698968C38BB913CBFC82"
      + "23A628553168947D59DCC912042351377AC5FB32");*/

    var x = BigInteger.fromHex("4A96B5688EF573284664698968C38BB913CBFC82")
    var y =  BigInteger.fromHex("23A628553168947D59DCC912042351377AC5FB32")
    var G = new ECPointFp(curve, curve.fromBigInteger(x), curve.fromBigInteger(y))

    return new X9ECParameters(curve, G, n, h);
  },
  
  secp192k1: function() {
    // p = 2^192 - 2^32 - 2^12 - 2^8 - 2^7 - 2^6 - 2^3 - 1
    var p = fromHex("FFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFEFFFFEE37");
    var a = BigInteger.ZERO;
    var b = fromHex("3");
    //byte[] S = null;
    var n = fromHex("FFFFFFFFFFFFFFFFFFFFFFFE26F2FC170F69466A74DEFD8D");
    var h = BigInteger.ONE;
    var curve = new ECCurveFp(p, a, b);
    /*var G = curve.decodePointHex("04"
      + "DB4FF10EC057E9AE26B07D0280B7F4341DA5D1B1EAE06C7D"
      + "9B2F2F6D9C5628A7844163D015BE86344082AA88D95E2F9D");*/

    var x = BigInteger.fromHex("DB4FF10EC057E9AE26B07D0280B7F4341DA5D1B1EAE06C7D")
    var y =  BigInteger.fromHex("9B2F2F6D9C5628A7844163D015BE86344082AA88D95E2F9D")
    var G = new ECPointFp(curve, curve.fromBigInteger(x), curve.fromBigInteger(y))

    return new X9ECParameters(curve, G, n, h);
  },
  
  secp192r1: function() {
    // p = 2^192 - 2^64 - 1
    var p = fromHex("FFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFEFFFFFFFFFFFFFFFF");
    var a = fromHex("FFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFEFFFFFFFFFFFFFFFC");
    var b = fromHex("64210519E59C80E70FA7E9AB72243049FEB8DEECC146B9B1");
    //byte[] S = Hex.decode("3045AE6FC8422F64ED579528D38120EAE12196D5");
    var n = fromHex("FFFFFFFFFFFFFFFFFFFFFFFF99DEF836146BC9B1B4D22831");
    var h = BigInteger.ONE;
    var curve = new ECCurveFp(p, a, b);

    var x = BigInteger.fromHex("188DA80EB03090F67CBF20EB43A18800F4FF0AFD82FF1012")
    var y =  BigInteger.fromHex("07192B95FFC8DA78631011ED6B24CDD573F977A11E794811")
    var G = new ECPointFp(curve, curve.fromBigInteger(x), curve.fromBigInteger(y))

    return new X9ECParameters(curve, G, n, h);
  },
  
  secp224r1: function() {
    // p = 2^224 - 2^96 + 1
    var p = fromHex("FFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF000000000000000000000001");
    var a = fromHex("FFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFEFFFFFFFFFFFFFFFFFFFFFFFE");
    var b = fromHex("B4050A850C04B3ABF54132565044B0B7D7BFD8BA270B39432355FFB4");
    //byte[] S = Hex.decode("BD71344799D5C7FCDC45B59FA3B9AB8F6A948BC5");
    var n = fromHex("FFFFFFFFFFFFFFFFFFFFFFFFFFFF16A2E0B8F03E13DD29455C5C2A3D");
    var h = BigInteger.ONE;
    var curve = new ECCurveFp(p, a, b);
    /*var G = curve.decodePointHex("04"
      + "B70E0CBD6BB4BF7F321390B94A03C1D356C21122343280D6115C1D21"
      + "BD376388B5F723FB4C22DFE6CD4375A05A07476444D5819985007E34");*/

    var x = BigInteger.fromHex("B70E0CBD6BB4BF7F321390B94A03C1D356C21122343280D6115C1D21")
    var y =  BigInteger.fromHex("BD376388B5F723FB4C22DFE6CD4375A05A07476444D5819985007E34")
    var G = new ECPointFp(curve, curve.fromBigInteger(x), curve.fromBigInteger(y))

    return new X9ECParameters(curve, G, n, h);
  },
  
  secp256k1: function() {
    // p = 2^256 - 2^32 - 2^9 - 2^8 - 2^7 - 2^6 - 2^4 - 1
    var p = fromHex("FFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFEFFFFFC2F");
    var a = BigInteger.ZERO;
    var b = fromHex("7");
    //byte[] S = null;
    var n = fromHex("FFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFEBAAEDCE6AF48A03BBFD25E8CD0364141");
    var h = BigInteger.ONE;
    var curve = new ECCurveFp(p, a, b);
    /*var G = curve.decodePointHex("04"
      + "79BE667EF9DCBBAC55A06295CE870B07029BFCDB2DCE28D959F2815B16F81798"
      + "483ADA7726A3C4655DA4FBFC0E1108A8FD17B448A68554199C47D08FFB10D4B8");*/

    var x = BigInteger.fromHex("79BE667EF9DCBBAC55A06295CE870B07029BFCDB2DCE28D959F2815B16F81798")
    var y = BigInteger.fromHex("483ADA7726A3C4655DA4FBFC0E1108A8FD17B448A68554199C47D08FFB10D4B8")
    var G = new ECPointFp(curve, curve.fromBigInteger(x), curve.fromBigInteger(y))

    return new X9ECParameters(curve, G, n, h);
  },
  
  secp256r1: function() {
    // p = 2^224 (2^32 - 1) + 2^192 + 2^96 - 1
    var p = fromHex("FFFFFFFF00000001000000000000000000000000FFFFFFFFFFFFFFFFFFFFFFFF");
    var a = fromHex("FFFFFFFF00000001000000000000000000000000FFFFFFFFFFFFFFFFFFFFFFFC");
    var b = fromHex("5AC635D8AA3A93E7B3EBBD55769886BC651D06B0CC53B0F63BCE3C3E27D2604B");
    //byte[] S = Hex.decode("C49D360886E704936A6678E1139D26B7819F7E90");
    var n = fromHex("FFFFFFFF00000000FFFFFFFFFFFFFFFFBCE6FAADA7179E84F3B9CAC2FC632551");
    var h = BigInteger.ONE;
    var curve = new ECCurveFp(p, a, b);
    /*var G = curve.decodePointHex("04"
      + "6B17D1F2E12C4247F8BCE6E563A440F277037D812DEB33A0F4A13945D898C296"
      + "4FE342E2FE1A7F9B8EE7EB4A7C0F9E162BCE33576B315ECECBB6406837BF51F5");*/

    var x = BigInteger.fromHex("6B17D1F2E12C4247F8BCE6E563A440F277037D812DEB33A0F4A13945D898C296")
    var y =  BigInteger.fromHex("4FE342E2FE1A7F9B8EE7EB4A7C0F9E162BCE33576B315ECECBB6406837BF51F5")
    var G = new ECPointFp(curve, curve.fromBigInteger(x), curve.fromBigInteger(y))


    return new X9ECParameters(curve, G, n, h);
  } 
}

module.exports = function getSECCurveByName(name) {
  return (typeof namedCurves[name] == 'function')? namedCurves[name]() : null;
}
