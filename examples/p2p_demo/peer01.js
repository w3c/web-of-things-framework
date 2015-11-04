var p2p = require('../../libs/transport/p2p/index');
var logger = require('../../logger');

function on_message(from, id, message, reply_fn) {
    logger.debug("P2P FROM: %j ; MY ID: %j ; MESSAGE: %j", from, id, message);
}

var sendmsg1 = p2p.Chord(31311, 1, null, on_message);
var sendmsg2 = p2p.Chord(31312, 1, null, on_message);

p2p.Client(on_message, 31310);

sendmsg1({ address: "127.0.0.1", port: 31312 }, null, { msg: "test message from sendmsg1" });
sendmsg2({ address: "127.0.0.1", port: 31311 }, null, { msg: "test message from sendmsg2" });

sendmsg2({ address: "127.0.0.1", port: 31310 }, null, { msg: "test message from sendmsg2 to CLIENT" });


