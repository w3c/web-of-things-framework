/* config.js - JSON server configuration file */

var config = {
    framework: {
        //  framework related settings
        action_timeout: 30000,      // default action timeout in milliseconds
        property_timeout: 30000     // default property timeout in milliseconds
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
        http: {                 //  to provide end point for inter server communication
            //port: 8899          //  end point port that listen for messages from other WoT servers
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