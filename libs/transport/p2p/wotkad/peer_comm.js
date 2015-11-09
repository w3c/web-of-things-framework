var dgram = require('dgram');


function send_msg(data, port, address) {
    var socketOptions = { type: 'udp4', reuseAddr: true };
    var socketMessageHandler = function (buffer, info) {
        var b = buffer;
    };

    var socket = dgram.createSocket(socketOptions, socketMessageHandler);
    socket.send(data, 0, data.length, port, address);
}


module.exports = {
    sendmsg: send_msg
}

