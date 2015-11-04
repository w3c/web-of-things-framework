/**
* @module kad/constants
*/

'use strict';

var ms = require('ms');

/**
* Protocol constants
* #exports
* @see http://xlattice.sourceforge.net/components/protocol/kademlia/specs.html#constants
*/
module.exports = {

  ALPHA: 3,
  B: 160,
  K: 20,

  T_REFRESH: ms('3600s'),
  T_REPLICATE: ms('3600s'),
  T_REPUBLISH: ms('86400s'),

  // T_EXPIRE is 5s higher than protocol spec to avoid republish race condition
  T_EXPIRE: ms('86405s'),

  T_RESPONSETIMEOUT: ms('100s'),

  MESSAGE_TYPES: [
    'PING',
    'PONG',
    'STORE',
    'STORE_REPLY',
    'FIND_NODE',
    'FIND_NODE_REPLY',
    'FIND_VALUE',
    'FIND_VALUE_REPLY'
  ]

};
