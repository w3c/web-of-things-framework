/* config.js - JSON server configuration file */

var config = {
    framework: {
        //  framework related settings
        action_timeout: 30000,      // default action timeout in milliseconds
        property_timeout: 30000     // default property timeout in milliseconds
    },
    servers: {
        web: {
            http_port: 8888,
            ws_port: 8080,
            base_uri: 'http://localhost:8888/wot/'
        },
        restapi: {
        },
        coap: {
        },
        mqtt: {
        }
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
    things: {
        //  register the things from a local config file, database or web service
        //  the value of the "proc" config settings indicates what function of the /libs/thing/thing_handler
        //  is called to initialize things upon application start
        register: {
            proc: 'localreg',
            param: ''  
        }
        /*
        register: {
            proc: 'databasereg',
            param: 'the database connection parameters e.g. PostgreSQL connection string ...'
        },
        register: {
            proc: 'webservicereg',
            param: 'web service connection parameters'
        }  
        */      
    }
};

module.exports = config;