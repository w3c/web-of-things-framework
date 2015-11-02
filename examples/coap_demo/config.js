/* config.js - JSON server configuration file */

var config = {
    framework: {
        //  framework related settings
        action_timeout: 30000,      // default action call timeout in milliseconds
        property_timeout: 30000     // default property set timeout in milliseconds
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
    },
    //  Server settings
    //  These are really protocols but since the web server settings is included here as well the setting name is "server".
    //  These servers/protocols will be exposed to the clients i.e. the clients connect to WoT via these servers/protocols
    servers: {
        web: {
            port: 8888,         // http web server port to listen reqests from browsers
        },
        ws: {
            port: 8080          // web socket port
        },
        http: {
            //  to provide end point for inter server communication  
            //  pass the fqdn to other wot servers as this is the end point listener               
            fqdn: "http://localhost:8889",
            //  end point port that listen for messages from other WoT servers
            port: 8889          
        },
        restapi: {
        },
        coap: {
            port: 5683          // default CoAP port
        },
        mqtt: {
        }
    },
    //  The application database configuration. The ./data/dbs directory includes the database implementations
    //  where the db.js file implements the database functions
    db: {
        type: 'file'
    }
};

module.exports = config;