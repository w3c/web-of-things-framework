var util = require('util');
var config = require('../config');
var logger = require('../logger');


function initialize_web_server (server_config) {
    if (!server_config.web || !server_config.web.port || !server_config.ws.port) {
        // http server is not configured in the config file -> quit
        return;
    }
    
    logger.debug("HTTP server configuration exists. Start HTTP server");
    var http_server = require('./http/server.js');
    http_server.start();
}

function initialize_server(server, settings) {
    try {
        logger.debug(server + " server configuration exists. Start " + server + " server");
        var path = './' + server + '/server.js';
        var server_handler = require(path);
        server_handler.start(settings);
    }
    catch (e) {
        logger.error("Error in starting " + server + " server. " + e.message);
    }
}

function initialize_servers() {
    try {
        var server_config = config.servers;
        //should be an array
        if (!server_config) {
            throw new Error("Error in populating servers config settings. The servers config settings does not exists");
        }
        
        //  Call the servers start method
        //  The servers must implement the start method 
        for (server in server_config) {
            var settings = server_config[server];
            initialize_server(server, settings);
        }
    }
    catch (e) {
        logger.error("Error in initialize_servers(),  " + e.message);
    }

    //// initialize the web server if it is configured
    //if (server_config.web && server_config.web.port && server_config.ws.port) {
    //    initialize_web_server(server_config);
    //}

    //if (server_config.http && server_config.http.port ) {
    //    throw new Error("HTTP server handler is not implemented");
    //}

    //if (server_config.restapi && server_config.restapi.port) {
    //    throw new Error("REST API server handler is not implemented");
    //}

    //if (server_config.coap && server_config.coap.port) {
    //    throw new Error("CoAP server handler is not implemented");
    //}

    //if (server_config.mqtt && server_config.mqtt.port) {
    //    throw new Error("MQTT server handler is not implemented");
    //}
}

module.exports = {
    initialize: initialize_servers
};
