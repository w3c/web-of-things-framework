var assert = require('assert');
var logger = require('../../logger');
var wotkad = require('../../libs/transport/p2p/wotkad');

exports.start = function start(settings) {
    try {
        logger.info('Bootstrap P2P network, initiate seed node');
        
        // start the P2P overlay networks and Kademlia DHT
        
        assert(settings.address, 'No p2p address is specified');
        assert(settings.port, 'No p2p port is specified');
        
        // Create our first node
        var seed_node = wotkad({
            transport: wotkad.transports.UDP,
            address: '127.0.0.1',
            port: 65530,
            nick: 'wotseed01'
        });

        logger.info('P2P overlay network started');
    }
    catch (err) {
        logger.error("P2P handler start error %j", err, {});
    }

}