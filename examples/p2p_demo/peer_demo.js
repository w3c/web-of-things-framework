var PeerNetwork = require('../../libs/transport/p2p/wotkad/peer_network');
var logger = require('../../logger');

var peernet = new PeerNetwork();

// create the overlay network with node1
var options = {
    address: '127.0.0.1',
    port: 65529,
    nick: 'seed1'
};
var seed1 = peernet.create_peer(options);

options = {
    address: '127.0.0.1',
    port: 65530,
    nick: 'seed2',
    seeds: [{ address: '127.0.0.1', port: 65529 }]
};
var seed2 = peernet.create_peer(options);

// connect to the overlay network
options = {
    address: '127.0.0.1',
    port: 65531,
    nick: 'node2',
    seeds: [{ address: '127.0.0.1', port: 65529 }]
};
var peer2 = peernet.create_peer(options);

options = {
    address: '127.0.0.1',
    port: 65532,
    nick: 'node3',
    seeds: [{ address: '127.0.0.1', port: 65530 }]
};
var peer3 = peernet.create_peer(options);

peer2.on('connect', function (err, value) {
    if (err) {
        return logger.error("peer connect error %j", err, {});
    }
    
    logger.debug("peer peer2 %j connected to overlay network", value, {});

    peer2.put('door12/events/bell', 'beep1 from peer2', function (err) {
        if (err) {
            return logger.error("onPut error %j", err, {});
        }
        
    });

});

peer3.on('connect', function (err, value) {
    if (err) {
        return logger.error("peer connect error %j", err, {});    
    }

    logger.debug("peer peer3 %j connected to overlay network", value, {});
    
    peernet.on('data', function (key) {
        if (key == 'door12/events/bell') {
            peer3.get('door12/events/bell', function (err, value) {
                if (err) {
                    return logger.error("peer get error %j", err, {});
                }
                logger.debug('--------------------------------------------------------------------------------------------------------');
                logger.debug('peer3 received door12/events/bell value is : ' + value);
                logger.debug('--------------------------------------------------------------------------------------------------------');
            });
        }
    });
    
});