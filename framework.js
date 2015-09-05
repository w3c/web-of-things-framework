// wot-framework.js
var logger = require('./logger');

var server_handler = require('./servers/server_handler');
var thing_handler = require('./libs/thing/thing_handler');

exports.init = function init(things) {
    //  call the thing handler to start handling the things
    thing_handler.init(things);
    
    // start the servers
    server_handler.init();
    
    logger.debug("WoT Framework is initialised");

}