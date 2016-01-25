/*
 
Streemo - Real time communication system for humans and machines

Copyright (C) 2016 T. Z. Pardi

This program is free software; you can redistribute it and/or modify it under the terms of the GNU General Public License as 
published by the Free Software Foundation; either version 2 of the License, or (at your option) any later version.

This program is distributed in the hope that it will be useful, but WITHOUT ANY WARRANTY; without even the implied warranty 
of MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the GNU General Public License for more details.

*/

var logger = require('./logger');
var HashMap = require('hashmap');
var http = require('http');
var appevents = require('./libs/events/AppEvents');

var WebSocketSrv = exports.WebSocketSrv = function () {
    try {
        this.server = 0;
        this.listOfClients = new HashMap();
    }
    catch (e) {
        logger.error(e);
    }
};

WebSocketSrv.prototype.onPeerMessage = function (recipient, data) {
    try {

        var msgarray = wotmsg.get_msg_array(data);
        if (!msgarray || !msgarray.length || msgarray.length != 3)
            throw new Error("invalid message");
        
        var header = msgarray[0];
        var payload = msgarray[1];
        if (!payload || !payload.aud)
            throw new Error("invalid aud element");
        
        // get the account from the list
        var client = this.listOfClients.get(payload.aud);
        if (!client) {
            // TODO
            return;   
        }
        
        var sender = payload.iss;
        if (!sender)
            throw new Error("invalid sender element");
        
        //  get the public key for the sender only contacts are 
        //  allowed communicate with eachother via peer to peer
        var public_key = client.publickey;
        if (!public_key) {
            throw new Error("peer message sender '" + sender + "' is not a contact");
        }
        
        var message = wotmsg.decode(data, public_key);
        if (!message || !message.data)
            throw new Error("invalid JWT message");
        
        // forward the message to the recipient contact
        var socket = client.socket;
        
    }
    catch (err) {
        logger.error("onPeerMessage error %j", err);
    }
}

WebSocketSrv.prototype.sart = function (io) {
    var self = this;
    
    io.on('connection', function (socket) {
        
        var client = socket;

        socket.on("register_account", function (request, callback) {
            try {
                var account = request.account;
                var publickey = request.publickey;
                self.listOfClients.set(account, { publickey: publickey, socketid: socket.id, socket: socket });
                callback();
                logger.debug("ws register_account from: " + account);
            }
            catch (err) {
                logger.error(err);
            }
        });
        
        socket.on("put", function (request, callback) {
            try {
                if (!request.key || !request.value) {
                    return callback("invalid request parameter"); 
                }
                
                if (!global.streemo_node) {
                    return callback("error: 0x0110, the node is not initialized");
                }

                //global.appevents.emit(global.appevents.TYPES.ONPEERMSG, { action: "put", key: request.key, value: request.value });
                global.streemo_node.put(request.key, request.value, function (err) {
                    if (err) {
                        logger.error("node.put error: %j", err);
                    }
                    callback(err);

                    // broadcast the message
                    logger.debug("boradcast to ws peers");
                    socket.broadcast.emit("put", request);

                    logger.debug("ws put for key: " + request.key);

                    //
                });
            }
            catch (err) {
                logger.error(err);
            }
        });
        
        socket.on("peermsg", function (request) {
            try {
                var recipient = request.recipient;
                if (recipient) {
                    logger.debug("ws peermsg from socket.id: " + socket.id);
                    var contactobj = self.listOfClients.get(recipient);
                    if (contactobj && contactobj.socket) {
                        logger.debug("sending peermsg to " + recipient);
                        contactobj.socket.emit("peermsg", request);
                    }

                    logger.debug("ws peermsg to: " + recipient);
                }  
            }
            catch (err) {
                logger.error(err);
            }
        });
        
        socket.on("find", function (key, callback) {
            try {
                if (!key) {
                    return callback("invalid key parameter");    
                }
                
                if (!global.streemo_node) {
                    return callback("error: 0x0110, the node is not initialized");   
                }

                global.streemo_node.find(key, function (err, msg) {
                    callback(err, msg);
                });
            }
            catch (err) {
                logger.error(err);
            }
        });
        
        socket.on("disconnect", function () {
            try {
                var account;
                self.listOfClients.forEach(function (value, key) {
                    if (socket.id == value.socketid) {
                        account = key;
                    }
                });
                if (account) {
                    self.listOfClients.remove(account);
                }
            }
            catch (err) {
                logger.error(err);
            }
        });


    });

    logger.info("websocketsrv app srv initialized");
}

WebSocketSrv.prototype.init = function () {
    try {
        var srv = http.createServer(function (request, response) {
            // TODO handle this connection 
            logger.debug((new Date()) + ' received request for ' + request.url);            
            response.writeHead(404);
            response.end();
        });
        srv.listen(32318, function () {
            logger.info((new Date()) + ' Server is listening on port 32318');
        });
        
        this.server = srv;

        var io = require('socket.io')(this.server);
        this.sart(io);

    }
    catch (err) {
        logger.error(err);
    }
};





