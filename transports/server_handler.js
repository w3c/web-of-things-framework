var util = require('util');
var logger = require('../logger');

var config = global.appconfig;

function initialize_server(server, settings) {
    try {
        logger.debug(server + " server configuration exists. Start " + server + " server");
        var path = './' + server + '/handler.js';
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
}

module.exports = {
    init: initialize_servers
};
