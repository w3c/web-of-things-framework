// wot-framework.js
var logger = require('./logger');
var config = require('./config');

var server_handler = require('./servers/server_handler');
var thing_handler = require('./libs/thing/thing_handler');

// get the thing initialization configuration settings
var thing_reg_config = config.things.register;
if (!thing_reg_config || !thing_reg_config.proc || thing_reg_config.param == null) {
    // unable to continue there is no thing initialization config settings
    return logger.error("Invalid thing initialization configuration settings. things.register settings must exists in the configuration file to run the application");
}

thing_handler[thing_reg_config.proc](thing_reg_config.param);

// start the servers
server_handler.initialize();

logger.debug("WoT Framework is initialised");

