var util = require('util');
var config = require('../config');
var logger = require('../logger');


function initialize_http_server (server_config) {
    if (!server_config.web || !server_config.web.http_port || !server_config.web.ws_port || !server_config.web.base_uri) {
        return;
    }
    
    logger.debug("HTTP server configuration exists. Start HTTP server");
    var http_server = require('./http/server.js');
    var wsd = require('./http/wsd.js');
}

function initialize_servers () {
    var server_config = config.servers;
    //should be an array
    if (!server_config ) {
        throw new Error("Error in populating servers config settings. The servers config settings does not exists");
    }

    initialize_http_server(server_config);
}

module.exports = {
    initialize: initialize_servers
};
