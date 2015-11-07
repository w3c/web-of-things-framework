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

'use strict';

var assert = require('assert');
var crypto = require('crypto');
var constants = require('./constants');

/**
* Validate a key
* #isValidKey
*/
exports.isValidKey = function(key) {
  return !!key && key.length === constants.B / 4;
};

/**
* Create a valid ID from the given string
* #createID
* @param {string} data
*/
exports.createID = function(data) {
  return crypto.createHash('sha1').update(data).digest('hex');
};

/**
* Convert a key to a buffer
* #hexToBuffer
* @param {string} hexString
*/
exports.hexToBuffer = function(hexString) {
  var buf = new Buffer(constants.K)

  buf.write(hexString, 0, 'hex');

  return buf;
}

/**
* Calculate the distance between two keys
* #getDistance
* @param {string} id1
* @param {string} id2
*/
exports.getDistance = function(id1, id2) {
  assert(exports.isValidKey(id1), 'Invalid key supplied');
  assert(exports.isValidKey(id2), 'Invalid key supplied');

  var distance = new Buffer(constants.K);
  var id1Buf = exports.hexToBuffer(id1);
  var id2Buf = exports.hexToBuffer(id2);

  for(var i = 0; i < constants.K; ++i) {
    distance[i] = id1Buf[i] ^ id2Buf[i];
  }

  return distance;
};

/**
* Compare two buffers for sorting
* #compareKeys
* @param {buffer} b1
* @param {buffer} b2
*/
exports.compareKeys = function(b1, b2) {
  assert.equal(b1.length, b2.length);

  for (var i = 0; i < b1.length; ++i) {
    if (b1[i] !== b2[i]) {
      if (b1[i] < b2[i]) {
        return -1;
      } else {
        return 1;
      }
    }
  }

  return 0;
};

/**
* Calculate the index of the bucket that key would belong to
* #getBucketIndex
* @param {string} id1
* @param {string} id2
*/
exports.getBucketIndex = function(id1, id2) {
  assert(exports.isValidKey(id1), 'Invalid key supplied');
  assert(exports.isValidKey(id2), 'Invalid key supplied');

  var distance = exports.getDistance(id1, id2);
  var bucketNum = constants.B;

  for (var i = 0; i < distance.length; i++) {
    if (distance[i] === 0) {
      bucketNum -= 8;
      continue;
    }

    for (var j = 0; j < 8; j++) {
      if (distance[i] & (0x80 >> j)) {
        return --bucketNum;
      } else {
        bucketNum--;
      }
    }
  }

  return bucketNum;
};

/**
* #getPowerOfTwoBuffer
* @param {number} exp
*/
exports.getPowerOfTwoBuffer = function(exp) {
  assert.ok(exp >= 0 && exp < constants.B);

  var buffer = new Buffer(constants.K);
  var byte = parseInt(exp / 8);

  // we set the byte containing the bit to the right left shifted amount
  buffer.fill(0);
  buffer[constants.K - byte - 1] = 1 << (exp % 8);

  return buffer;
};

/**
* Assuming index corresponds to power of 2
* (index = n has nodes within distance 2^n <= distance < 2^(n+1))
* #getRandomInBucketRangeBuffer
* @param {number} index
*/
exports.getRandomInBucketRangeBuffer = function(index) {
  var base = exports.getPowerOfTwoBuffer(index);
  var byte = parseInt(index / 8); // randomize bytes below the power of two

  for (var i = constants.K - 1; i > (constants.K - byte - 1); i--) {
    base[i] = parseInt(Math.random() * 256);
  }

  // also randomize the bits below the number in that byte
  // and remember arrays are off by 1
  for (var i = index - 1; i >= byte * 8; i--) {
    var one = Math.random() >= 0.5;
    var shiftAmount = i - byte * 8;

    base[constants.K - byte - 1] |= one ? (1 << shiftAmount) : 0;
  }

  return base;
};
