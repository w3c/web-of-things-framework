var wotkad = require('../../libs/transport/p2p/wotkad/kaddht');
var log = require('../../logger');

var levelup = require('levelup');
var localstorage = require('../../libs/transport/p2p/wotkad/lib/storages/localstorage');
var EventEmitter = require('events').EventEmitter;

// The two nodes share a signaller
var signaller = new EventEmitter();

// Create our first node
var node1 = wotkad({
    address: '127.0.0.1',
    port: 65530,
    nick: 'node1',
    validateKeyValuePair: function (key, value, callback) {
        callback(true);
    }
});

// Create a second node
var node2 = wotkad({
    address: '127.0.0.1',
    port: 65531,
    nick: 'node2',
    seeds: [{ address: '127.0.0.1', port: 65530 }],
    validateKeyValuePair: function (key, value, callback) {
        callback(true);
    }
});

var node3 = wotkad({
    address: '127.0.0.1',
    port: 65532,
    nick: 'node33',
    seeds: [{ address: '127.0.0.1', port: 65530 }],
    validateKeyValuePair: function (key, value, callback) {
        callback(true);
    }
});

node3.on('connect', onNode3Ready);

function onNode3Ready() {
    node1.put('door12/events/bell', 'beep1 from node1', onPut);
}

var is_modified = false;

function onPut(err) {
    if (err) {
        return log.error("onPut error %j", err, {});
    }

    node2.get('door12/events/bell', function (err, value) {
        if (err) {
            return log.error("error %j", err, {});   
        }
        log.debug('----------------------------------------------------' );
        log.debug('node2 received door12/events/bell value is : ' + value);
        log.debug('----------------------------------------------------');

        addnode();

    });
}

function addnode() {
    var timer = setTimeout(function () {

        var node4 = wotkad({
            address: '127.0.0.1',
            port: 65533,
            nick: 'node44',
            seeds: [{ address: '127.0.0.1', port: 65530 }],
            validateKeyValuePair: function (key, value, callback) {
                callback(true);
            }
        });
        
        node4.on('connect', function () {
            node4.get('door12/events/bell', function (err, value) {
                if (err) {
                    return log.error("error %j", err);
                }
                log.debug('----------------------------------------------------');
                log.debug('node4 received door12/events/bell value is : ' + value);
                log.debug('----------------------------------------------------');
            });
        });

    },
    5000);
}


function putloop() {
    var count = 1;

    var timer = setInterval(function () {
        log.debug('node1 put the value');
        node1.put('door12/events/bell', 'beep count No. + ' + count++ + ' from node1', function (err) {
            
            if (err) {
                return log.error("error %j", err, {});
            }

            if (count > 5) {
                clearInterval(timer);
                node2.get('door12/events/bell', function (err, value) {
                    if (err) {
                        return log.error("error %j", err);
                    }
                    log.debug('----------------------------------------------------');
                    log.debug('node2 received door12/events/bell value is : ' + value);
                    log.debug('----------------------------------------------------');
                });
            }

        });        
    },
    1000);
}






