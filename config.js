/* config.js - JSON server configuration file */

var config = {
    server: {
        fqdn: 'example.com'  // this server's fully qualified domain name
    },
    /*
        Log levels are 
        error
        info
        debug
     
        Use debug to log all levels and get detailed logs in the log file
     */
    log: {
        level: "debug" 
    }
};

module.exports = config;