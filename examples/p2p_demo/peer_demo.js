var PeerNetwork = require('../../libs/transport/p2p/wotkad/peer_network');
var logger = require('../../logger');


var peers = new PeerNetwork();

var options = {
    address: '127.0.0.1',
    port: 65530,
    nick: 'node1'
};
var peer1 = peers.create_peer(options);

options = {
    address: '127.0.0.1',
    port: 65531,
    nick: 'node2',
    seeds: [{ address: '127.0.0.1', port: 65530 }],
};
var peer2 = peers.create_peer(options);

options = {
    address: '127.0.0.1',
    port: 65532,
    nick: 'node3',
    seeds: [{ address: '127.0.0.1', port: 65530 }],
};
var peer3 = peers.create_peer(options);

peer3.on('connect', function (err, value) {
    if (err) {
        return logger.error("peer connect error %j", err, {});    
    }

    logger.debug("peer %j connected to overlay network", value, {});

    peer2.put('door12/events/bell', 'beep1 from peer2', function (err) {
        if (err) {
            return logger.error("onPut error %j", err, {});
        }

        peer3.get('door12/events/bell', function (err, value) {
            if (err) {
                return logger.error("error %j", err, {});
            }
            logger.debug('--------------------------------------------------------------------------------------------------------');
            logger.debug('peer3 received door12/events/bell value is : ' + value);
            logger.debug('--------------------------------------------------------------------------------------------------------');
        });
    });
});