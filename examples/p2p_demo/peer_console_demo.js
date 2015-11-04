var kademlia = require('../../libs/transport/p2p/wotkad');

global.logger = require('../../logger');
var log = global.logger;

var levelup = require('levelup');
var localstorage = require('../../libs/transport/p2p/wotkad/lib/storages/localstorage');
var EventEmitter = require('events').EventEmitter;

// The two nodes share a signaller
var signaller = new EventEmitter();

// Create our first node
var node1 = kademlia({
    transport: kademlia.transports.UDP,
    address: '127.0.0.1',
    port: 65530,
    nick: 'node1',
    signaller: signaller,
    storage: new localstorage('node1') // levelup('node1')
});

// Create a second node
var node2 = kademlia({
    transport: kademlia.transports.UDP,
    address: '127.0.0.1',
    port: 65531,
    nick: 'node2',
    signaller: signaller,
    storage: new localstorage('node2'), //levelup('node2'),
    seeds: [{ address: '127.0.0.1', port: 65530 }]
});

node2.on('connect', onNode2Ready);

function onNode2Ready() {
    node1.put('door12/events/bell', 'beep1', onPut);
}

var is_modified = false;

function onPut(err) {
    node2.get('door12/events/bell', function (err, value) {
        if (err) {
            return log.error("error %j", err);   
        }
        log.debug('----------------------------------------------------' );
        log.debug('door12/events/bell value is : ' + value);
        log.debug('----------------------------------------------------');

        if (!is_modified) {
            // now modify the data
            is_modified = true;
            node1.put('door12/events/bell', 'beep2', onPut);
        }
    });
}





