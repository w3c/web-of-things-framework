/*
 
Streemo - Real time communication system for humans and machines

Copyright (C) 2016 T. Z. Pardi

This program is free software; you can redistribute it and/or modify it under the terms of the GNU General Public License as 
published by the Free Software Foundation; either version 2 of the License, or (at your option) any later version.

This program is distributed in the hope that it will be useful, but WITHOUT ANY WARRANTY; without even the implied warranty 
of MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the GNU General Public License for more details.

*/

'use strict';

var streemo = streemo || {};

global.streemo_node = 0;

var logger = require("./logger");
global.applogger = logger;

if (!global.appevents) {
    var AppEvents = require("./libs/events/AppEvents");
    global.appevents = new AppEvents();
}

var assert = require('assert');
var path = require('path');
var fs = require('fs');
var crypto = require('crypto');
var levelup = require('levelup');
var async = require('async');
var util = require('util');
var assert = require('assert');
var config = require('config');
var wotkad = require('./libs/wotkad/kaddht');
var discoverysrvc = require('./discoverysrvc');
var websocketsrv = require('./websocketsrv').WebSocketSrv;

var configarg = config.get('seed');
if ( !configarg ) {
    throw new Exception("Application error: the seed configuration is missing")
}

assert(configarg, "Invalid start arguments. Corect start format -config 'config settings' where 'config settings' is a field in the seedsconf.js file");
assert(configarg.address, "address must exists in the config field of seedsconf.js file");
assert(configarg.port, "port must exists in the config field of seedsconf.js file");
assert(configarg.seeds, "seeds must exists in the config field of seedsconf.js file");
assert(Array.isArray(configarg.seeds), 'Invalid seeds supplied. "seeds" must be an array');

// initialize the database path
var maindb_path = path.join(__dirname, 'db', 'streemodb');

async.waterfall([
    function (callback) {
        logger.init(callback);
    },      
    function (callback) {
        // create the db directory
        logger.info("initializing database directory");
        logger.info("maindb_path: %s", maindb_path);
        fs.open(maindb_path, 'r', function (err, fd) {
            if (err && err.code == 'ENOENT') {
                /* the DB directory doesn't exist */
                logger.info("Creating database directory ...");
                var dbdir_path = path.join(__dirname, 'db');
                try {
                    fs.mkdirSync(dbdir_path);
                }
                catch (e) {
                    logger.error("creating database error: %j", e);
                }
                try {
                    fs.mkdirSync(maindb_path);
                }
                catch (e) {
                    logger.error("creating database error: %j", e);
                }
                fs.open(maindb_path, 'r', function (err, fd) {
                    if (err) {
                        callback(err)
                    }
                    else {
                        logger.info("DB directory created");
                        callback();
                    }
                });
            }
            else {
                callback();
            }
        });
    },    
    function (callback) {        
        var acctxt = "" + configarg.address + ":" + configarg.port;
        var accbuffer = new Buffer(acctxt);
        var account = crypto.createHash('sha1').update(accbuffer).digest().toString('hex');
        logger.info("account is: %s", account);
        
        var node = {
            address: configarg.address,
            port: configarg.port,
            account: account,
            seeds: configarg.seeds
        };
        
        for (var i = 0; i < configarg.seeds.length; i++) {
            var str = "" + configarg.seeds[i].address + ":" + configarg.seeds[i].port;
            var buffer = new Buffer(str);
            var acc = crypto.createHash('sha1').update(buffer).digest().toString('hex');
            configarg.seeds[i].account = acc;
            logger.info("seed: %j", str);
        }        
        
        logger.debug("create peer");
        
        var onConnect = function (value) {
            logger.info("peer connected %j", value);            
        };

        var maindb = levelup(maindb_path);
        streemo.PeerNet.start(node, maindb, onConnect);
        callback();
    },
    function (callback) {
        if (config.has('discoverysrvc')) {
            var isdiscovery = config.get('discoverysrvc');
            if (isdiscovery) {
                logger.debug("to create discovery service");
                discoverysrvc.start(function () {
                    callback();
                });
            }
            else {
                logger.debug("NO discovery service");
                callback();
            }                
        }
        else {
            logger.debug("NO discovery service");
            callback();
        }
    },
    function (callback) {
        if (config.has('wsserver')) {
            var isws = config.get('wsserver');
            if (isws) {
                logger.debug("create web socket server");
                var wssrv = new websocketsrv();
                wssrv.init();
            }
            else {
                logger.debug("NO WS server");
                callback();
            }
        }
        else {
            logger.debug("NO WS server");
            callback();
        }
    }
    ], 
    function (err, result) {
        if (err) {
            console.log("Main init error: %j", err);
            logger.error("Main init error: %j", err);
        }
    }
);


streemo.PeerNet = (function (thisobj, logger, events) {
    thisobj.node = 0;
    
    function onPeerMessage(message, info) {
        //  NOT IMPLEMENTED
    }    
    
    function msg_stored(node_id, item) {
        //  NOT IMPLEMENTED
    }
    
    function put(key, value) {
        try {
            thisobj.node.put(key, value, function (err) {
                if (err) {
                    logger.error("node.put error: %j", err);
                }
            });
        }
        catch (e) {
            logger.error("node.put error: %j", e);
        }
    }
    
    function nodeProxy() {
        var isws = config.get('wsserver');
        if (!isws) { return; }

        global.appevents.on(global.appevents.TYPES.ONPEERMSG, function (data) {
            if (!thisobj.node) { return; }
            
            if (data.action) {
                if (data.action == "put") {
                    var key = data.key;
                    var value = data.value;
                    put(key, value);
                }
            }
        });
    }

    thisobj.start = function (node, streemodb, onConnected) {
        try {
            logger.info('Bootstrap P2P network, initiate seed node');
            
            //thisobj.contactsdb = contactsdb;
            
            if (!node) {
                throw new Error("Invalid P2P nodes parameter");
            }
            
            var createpeer = function (node) {
                
                var options = {
                    log: logger,
                    address: node.address, 
                    port: node.port,
                    account: node.account,      
                    seeds: node.seeds,
                    storage: streemodb,
                    peermsgHandler: onPeerMessage
                };
                
                var peernode = wotkad(options);
                peernode.create(function (err, value) {
                    if (err) {
                        return logger.error("Create peer error %j", err);
                    }
                    
                    logger.debug("peernode connected, address is " + peernode.Address + ":" + peernode.Port);
                    
                    thisobj.node = peernode;
                    global.streemo_node = thisobj.node;
                    
                    // start the websocket listener
                    nodeProxy();
                });
                
                peernode.on('connect', function (err, value) {
                    if (err) {
                        return logger.error("peer connect error %j", err);
                    }
                    // no error, add to the list
                    if (onConnected) {
                        onConnected(value);
                    }
                });
                
                peernode.on('msgstored', function msg_stored(node_id, item) {
                    if (item && item.key && item.hash) {
                        logger.debug("peernet msg_stored, node_id: " + node_id + ", item.key: " + item.key);
                    }
                });

            };
            
            // start the P2P overlay networks and Kademlia DHT by adding the first 2 peer nodes       
            
            assert(node.port, 'No p2p port is specified');
            assert(node.account, 'No p2p account is specified');
            
            logger.debug("starting seed node %j", node);
            
            //  Create the first seeds of the P2P network
            //  this seed nodea will never send a message and therefore
            //  the public key is not required to verify its signature  
            createpeer(node);
            
            logger.info('P2P overlay network started');
        }
        catch (err) {
            logger.error("P2P handler start error %j", err);
        }
    }
    
    thisobj.is_network_running = function () {
        return thisobj.node != 0;
    }
    
    return thisobj;
    
}(streemo.PeerNet || {}, global.applogger, global.appevents));
