var crypto = require('crypto');
var net = require('net');
var dgram = require('dgram');
var uuid = require('uuid');
var logger = require('../../../logger');

var DEFAULT_SRV_PORT = 31310;
var DEFAULT_CLI_PORT = 31309;

function create_hash(buff) {
    var shasum = crypto.createHash('sha1');
    shasum.update(buff);
    var value = shasum.digest();
    var num1 = value.readUInt32BE(0);
    var num2 = value.readUInt32BE(4);
    var num3 = value.readUInt32BE(8);
    var num4 = value.readUInt32BE(12);
    var array = [num1, num2, num3, num4] ;

    return array;
}

var hash = exports.hash = create_hash; //murmur.murmur128Sync;

var serialize = function serialize(message) {
    return new Buffer(JSON.stringify(message));
};
var deserialize = JSON.parse;

// Is key in (low, high)
function in_range(key, low, high) {
    return (less_than(low, high) && less_than(low, key) && less_than(key, high)) ||
        (less_than(high, low) && (less_than(low, key) || less_than(key, high))) ||
        (equal_to(low, high) && !equal_to(key, low));
}
exports.in_range = in_range;

// Is key in (low, high]
function in_half_open_range(key, low, high) {
    return (less_than(low, high) && less_than(low, key) && less_than_or_equal(key, high)) ||
        (less_than(high, low) && (less_than(low, key) || less_than_or_equal(key, high))) ||
        (equal_to(low, high));
}
exports.in_half_open_range = in_half_open_range;

// Key comparison
function less_than(low, high) {
    if (low.length !== high.length) {
        // Arbitrary comparison
        return low.length < high.length;
    }
    
    for (var i = 0; i < low.length; ++i) {
        if (low[i] < high[i]) {
            return true;
        } else if (low[i] > high[i]) {
            return false;
        }
    }
    
    return false;
}
exports.less_than = less_than;

function less_than_or_equal(low, high) {
    if (low.length !== high.length) {
        // Arbitrary comparison
        return low.length <= high.length;
    }
    
    for (var i = 0; i < low.length; ++i) {
        if (low[i] < high[i]) {
            return true;
        } else if (low[i] > high[i]) {
            return false;
        }
    }
    
    return true;
}
exports.less_than_or_equal = less_than_or_equal;

function equal_to(a, b) {
    if (a.length !== b.length) {
        return false;
    }
    
    for (var i = 0; i < a.length; ++i) {
        if (a[i] !== b[i]) {
            return false;
        }
    }
    
    return true;
}
exports.equal_to = equal_to;

// Computes a new key equal to key + 2 ^ exponent.
// Assumes key is a 4 element array of 32 bit words, most significant word first.
function add_exp(key, exponent) {
    var result = key.concat(); // copy array
    var index = key.length - Math.floor(exponent / 32) - 1;
    
    result[index] += 1 << (exponent % 32);
    
    var carry = 0;
    while (index >= 0) {
        result[index] += carry;
        carry = 0;
        if (result[index] > 0xffffffff) {
            result[index] -= 0x100000000;
            carry = 1;
        }
        --index;
    }
    
    return result;
}
exports.add_exp = add_exp;

exports.next_key = function next_key(key) {
    return add_exp(key, 0);
};

exports.key_equals = equal_to;

// Chord message types
var NOTIFY_PREDECESSOR = 0;
var NOTIFY_SUCCESSOR = 1;
var FIND_SUCCESSOR = 2;
var FOUND_SUCCESSOR = 3;
var MESSAGE = 4;

function Node(id, on_message, send) {
    var predecessor = null;
    var predecessor_ttl = 0;
    var self = { id: id };
    var successor = self;
    var successor_ttl = 0;
    var fingers = [];
    
    function closest_preceding_node(find_id) {
        for (var i = fingers.length - 1; i >= 0; --i) {
            if (fingers[i] && in_range(fingers[i].id, id, find_id)) {
                return fingers[i];
            }
        }
        
        if (in_range(successor.id, id, find_id)) {
            return successor;
        } else {
            return self;
        }
    }
    
    self.receive = function receive(from, message) {
        switch (message.type) {
            case NOTIFY_PREDECESSOR:
                if (predecessor === null || in_range(from.id, predecessor.id, id)) {
                    predecessor = from;
                }
                
                send(from, { type: NOTIFY_SUCCESSOR }, predecessor);
                
                predecessor_ttl = 12; // Some significant number of check/stabilize cycles to wait until declaring a predecessor dead
                break;

            case FOUND_SUCCESSOR:
                if (message.hasOwnProperty('next')) {
                    fingers[message.next] = from;
                }
                // Fall through
            case NOTIFY_SUCCESSOR:
                if (message.type === NOTIFY_SUCCESSOR) {
                    successor_ttl = 12;
                }
                
                if (in_range(from.id, id, successor.id)) {
                    successor = from;
                }
                break;

            case FIND_SUCCESSOR:
                if (in_half_open_range(message.id, id, successor.id)) {
                    message.type = FOUND_SUCCESSOR;
                    send(from, message, successor);
                } else {
                    send(closest_preceding_node(message.id), message, from);
                }
                break;

            case MESSAGE:
                if (message.id) {
                    if (in_half_open_range(message.id, id, successor.id)) {
                        logger.debug('delivering message ' + JSON.stringify(message) + ' to its final destination: ' + successor.id[0]);
                        delete message.id;
                        send(successor, message, from);
                    } else {
                        logger.debug('forwarding message ' + JSON.stringify(message) + ' from ' + id[0] + ' to ' + closest_preceding_node(message.id).id[0]);
                        send(closest_preceding_node(message.id), message, from);
                    }
                } else if (on_message) {
                    on_message(from, id, message.message, function reply(message, to, reply_to) {
                        send(to ? to : from, { type: MESSAGE, message: message }, reply_to);
                    });
                }
                break;

            default:
                // ignore any messages that we don't recognize
                console.error('Unknown Chord message type ' + message.type);
                break;
        }

        /*
        message.type_name = ({
            0: 'notify_predecessor',
            1: 'notify_successor',
            2: 'find_successor',
            3: 'found_successor',
            4: 'message'
        })[message.type];
        var pred = '?';
        if (predecessor) {
            pred = '' + predecessor.id[0] + ' (' + predecessor_ttl + ')';
        }
        console.log(from.id[0] + ' -> ' + id[0] + ' (' + pred + '-' + successor.id[0] + '): ' + JSON.stringify(message))
        */
    };
    
    var next_finger = 0;
    setInterval(function fix_fingers() {
        send(successor, { type: FIND_SUCCESSOR, id: add_exp(id, next_finger + 1), next: next_finger });
        next_finger += 13;
        if (next_finger >= 127) {
            next_finger -= 127;
        }
    }, 600).unref();
    
    setInterval(function check_predecessor_and_stabilize() {
        if (--predecessor_ttl < 1) { // if predecessor has failed to stabilize for "long" time, it has failed
            predecessor = null;
            predecessor_ttl = 1;
        }
        
        if (--successor_ttl < 1) {
            successor = self;
            successor_ttl = 1;
        }
        
        send(successor, { type: NOTIFY_PREDECESSOR });

    }, 700).unref();
    
    var join_retry;
    self.join = function join(remote) {
        predecessor = null;
        function try_to_join() {
            send(remote, { type: FIND_SUCCESSOR, id: id });
        }
        join_retry = setInterval(try_to_join, 2000).unref();
        try_to_join();
    };
    
    self.send_hash = function send_id(id, message, to, reply_to) {
        send(to, { type: MESSAGE, message: message, id: id }, reply_to);
    }
    
    self.send = function send(key, message, to, reply_to) {
        var key_hash = hash(key);
        self.send_hash(key_hash, message, to, reply_to);
    };
    
    return self;
}

// Returns a function for sending messages into the chord. Takes some parameters:
// to - node to send to {address: '1.2.3.4', port: 1234}; if null, sends to the local node
//      which is not useful for client-only nodes
// id - the ID (hash) whose successor should receive the message; if null, sends to a
//      representative virtual node on that physical node
// message - the message to send; must be msgpack-able
// reply_to - optional; the node to reply to; useful for forwarding messages
exports.Chord = function Chord(listen_port, virtual_nodes, join_existing_or_on_message, on_message) {
    var join_existing;
    
    if (join_existing_or_on_message) {
        if (join_existing_or_on_message.hasOwnProperty('port')) {
            join_existing = join_existing_or_on_message;
        } else if (!on_message) {
            on_message = join_existing_or_on_message;
        }
    }
    
    var port = listen_port ? listen_port : DEFAULT_SRV_PORT;
    
    var server = dgram.createSocket('udp4');
    server.bind(port);
    
    logger.debug("Starting chord server at port %d", port);
    
    var nodes = {};
    var last_node = null;
    var last_node_send = null;
    
    server.on('message', function (packet, remote) {
        var message = deserialize(packet);
        
        if (message.version !== 1) {
            logger.error("Unexpected Chord transport version " + message.version);
            return;
        }
        
        var to = last_node;
        if (message.to) {
            to = nodes[message.to];
        }
        if (to) {
            var from = message.from;
            if (!from.address) {
                from = {
                    address: remote.address,
                    port: remote.port,
                    id: from
                };
            }
            to.receive(from, message.message);
        }
    });
    
    // Create and connect local nodes.
    for (var i = 0; i < virtual_nodes; ++i) {
        (function () {
            var id = hash(uuid.v4());
            
            last_node_send = function send(to, message, reply_to) {
                if (!to) {
                    to = node;
                }
                if (to.receive) {
                    setImmediate(to.receive, reply_to ? reply_to : node, message);
                } else {
                    var from = reply_to ? (reply_to.receive ? reply_to.id : reply_to) : id;
                    var packet = serialize({
                        version: 1,
                        from: from,
                        to: to.id,
                        message: message
                    });
                    server.send(packet, 0, packet.length, to.port, to.address);
                }
            }
            
            var node = Node(id, on_message, last_node_send);
            
            if (last_node || join_existing) {
                node.join(last_node || join_existing);
            }
            last_node = nodes[id] = node;
        })();
    }
    
    // Returns a function for sending application messages over the Chord router.
    var chord_send_message = function chord_send_message(to, id, message, reply_to) {
        return last_node_send(to ? to : last_node, { type: MESSAGE, id: id, message: message }, reply_to);
    };
    
    chord_send_message.close = function chord_close() {
        server.unref();
    };
    
    return chord_send_message;
};

// A client is just a Chord node that never joins anyone else, but it still knows how
// to send and receive messages.
exports.Client = function Client(on_message, listen_port) {
    var port = listen_port ? listen_port : DEFAULT_CLI_PORT;
    return exports.Chord(port, 1, on_message);
};