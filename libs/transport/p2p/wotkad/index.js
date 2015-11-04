/**
* @module kad
*/

'use strict';

var assert = require('assert');
var async = require('async');
var Node = require('./lib/node');

/**
* Creates a new K-Node and returns it
* #createNode
* @param {object} options
* @param {function} onConnect
*/
module.exports = function createNode(options, onConnect) {
  if (options.seeds) {
    assert(Array.isArray(options.seeds), 'Invalid `options.seeds` supplied');
  } else {
    options.seeds = [];
  }

  for (var i = 0; i < options.seeds.length; i++) {
    var seed = options.seeds[i];
  }

  var node = new Node(options);

  async.eachSeries(options.seeds, connectToSeed, onConnect);

  function connectToSeed(seed, done) {
    node.connect(seed, done);
  }

  return node;
};

module.exports.Bucket = require('./lib/bucket');
module.exports.Contact = require('./lib/contact');
module.exports.Logger = require('../../../../logger');
module.exports.Message = require('./lib/message');
module.exports.Node = require('./lib/node');
module.exports.Router = require('./lib/router');
module.exports.transports = require('./lib/transports');
module.exports.utils = require('./lib/utils');
module.exports.constants = require('./lib/constants');
