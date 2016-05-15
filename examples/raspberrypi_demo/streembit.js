/*
 
This file is part of Streembit application. 
Streembit is an open source project to create a real time communication system for humans and machines. 

Streembit is a free software: you can redistribute it and/or modify it under the terms of the GNU General Public License 
as published by the Free Software Foundation, either version 3.0 of the License, or (at your option) any later version.

Streembit is distributed in the hope that it will be useful, but WITHOUT ANY WARRANTY; without even the implied warranty of 
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the GNU General Public License for more details.

You should have received a copy of the GNU General Public License along with Streembit software.  
If not, see http://www.gnu.org/licenses/.
 
-------------------------------------------------------------------------------------------------------------------------
Author: Tibor Zsolt Pardi 
Copyright (C) 2016 The Streembit software development team
-------------------------------------------------------------------------------------------------------------------------

*/

'use strict';

var streembit = streembit || {};

var pksecret;

try {
    if (process.argv.indexOf("-pksecret") != -1) {
        pksecret = process.argv[process.argv.indexOf("-pksecret") + 1]; //grab the next item
    }
}
catch (err) {
    console.log("argument parse error: %j", err);
}

if (!pksecret) {
    //  try to get the current directory
    console.log("The private key secret -pksecret command line parameter is required!");
    process.exit(1);
}

console.log("pksecret: %s", pksecret);

var config = require("./config.json");

// use the nodejs crypto library
global.cryptolib = "crypto";

global.streembit_node = 0;

var logger = require("streembitlib/logger/logger");
global.applogger = logger;

var AppEvents = require("streembitlib/events/AppEvents");
var appevents = new AppEvents();
global.appevents = appevents;

var assert = require('assert');
var path = require('path');
var fs = require('fs');
var levelup = require('levelup');
var async = require('async');
var util = require('util');
var assert = require('assert');
var streembut_utils = require("./utilities");
streembit.bootclient = require("./bootclient");
streembit.accountsDB = require("./streembitdb").accountsdb;
streembit.account = require("./account");
streembit.contacts = require("./contacts");
streembit.device_handler = require("./device_handler");
streembit.peernet = require("./peernet");
streembit.PeerTransport = require("./peertransport");

assert(config.node, "Invalid start arguments. Corect start format -config 'config settings' where 'config settings' is a field in the config.json file");
assert(config.node.port, "port must exists in the config field of config.json file");
assert(config.node.seeds, "seeds must exists in the config field of config.json file");
assert(Array.isArray(config.node.seeds), 'Invalid seeds supplied. "seeds" must be an array');

// initialize the database path
streembit.maindbdb = 0;
streembit.localdb = 0;

function devices_init() {
    try {
        streembit.device_handler.init();
    }
    catch (err) {
        logger.error("device_init error: %j", err);
    }
}


async.waterfall(
    [
        function (callback) {
            var wdir = process.cwd();
            var logspath = path.join(wdir, 'logs');
            var loglevel = config.log && config.log.level ? config.log.level : "debug";
            logger.init(loglevel, logspath, null, callback);
        },      
        function (callback) {
            //initialize the devices
            devices_init();
            callback();
        },
        function (callback) {
            // create the db directory
            logger.info("initializing 'maindb' database directory");
            streembut_utils.ensure_dbdir_exists( "maindb", callback);
        },    
        function (callback) {
            //create the main database
            var maindb_path = path.join(__dirname, 'db', 'maindb');
            streembit.maindbdb = levelup(maindb_path);
            callback();
        },
        function (callback) {
            // create the db directory
            logger.info("initializing 'localdb' database directory");
            streembut_utils.ensure_dbdir_exists("localdb", callback);
        },    
        function (callback) {
            // bootstrap the app with the streembit network
            logger.info("Get account " + config.node.account + " from the database");
            //  is the account exists in the local db
            streembit.accountsDB.get(config.node.account, function (err, account) {
                if (err) {
                    callback(err);
                }
                else{
                    callback(null, account);
                }
            });
        },   
        function (account, callback) {
            // bootstrap the app with the streembit network
            if (account) {
                logger.info("Initialize the account");
                streembit.account.initialize(account, pksecret , callback);
            }
            else {
                logger.info("Create a new account");
                streembit.account.create(config.node.account, pksecret, callback);
            }
        },    
        function (callback) {
            logger.info("public key: %s", streembit.account.public_key);
            streembit.bootclient.discovery(config.node.address, config.node.seeds, callback);
        },
        function (address, callback) {
            if (!address) {
                callback("failed to populate discovery address");
            }
            else {
                config.node.address = address;
                streembit.bootclient.resolveseeds(config.node.seeds, callback);
            }
        },
        function (seeds, callback) {
            config.node.seeds = seeds;
            streembit.PeerTransport.start(streembit.maindbdb, callback);
        },     
        function (callback) {
            // initialize the contacts
            streembit.contacts.init(callback);
        },
        function (callback) {
            streembit.peernet.publish_account(callback);
        }
    ], 
    function (err) {
        if (err) {
            console.log("Main init error: %j", err);
            logger.error("Main init error: %j", err);
        }
        else {
            //  the device connected to the network and the account 
            //  info was published to the DHT
            logger.info("The device is connected to Streembit");
        }
    }
);


appevents.on(appevents.APPEVENT, function (eventcmd, payload, info) {
    
    if (eventcmd == appevents.TYPES.ONPEERMSG) {
        streembit.peernet.onPeerMessage(payload, info);
    }
    else if (eventcmd == "devdesc_request") {
        streembit.device_handler.device_request(payload);
    }
    else if (eventcmd == "devread_property") {
        streembit.device_handler.read_property(payload);
    }
    else if (eventcmd == "devevent_subscribe") {
        streembit.device_handler.device_event_subscribe(payload);
    }

});