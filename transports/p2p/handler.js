var assert = require('assert');
var logger = require('../../logger');
var PeerNetwork = require('../../libs/transport/p2p/wotkad/peer_network');

exports.start = function start(settings) {
    try {
        logger.info('Bootstrap P2P network, initiate seed node');
        
        if (!settings || !settings.nodes || !settings.nodes.length) {
            throw new Error("Invalid P2P configuration settings");
        }
        
        // start the P2P overlay networks and Kademlia DHT        
        var peernet = new PeerNetwork();
        
        for (var i = 0; i < settings.nodes.length; i++) {
            var node = settings.nodes[i];
            assert(node.address, 'No p2p address is specified');
            assert(node.port, 'No p2p port is specified');
            assert(node.nick, 'No p2p nick is specified');
            
            // Create our first node
            var seed_node = peernet.create_peer({
                address: node.address,
                port: node.port,
                nick: node.nick,
                alg: {}, 
                private_key: {},
                public_key: {},
                seeds: node.seeds
            });    
        }

        logger.info('P2P overlay network started');
    }
    catch (err) {
        logger.error("P2P handler start error %j", err, {});
    }

}