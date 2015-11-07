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
    servers: {
        p2p: {
            nodes: [
                {
                    address: 'localhost',
                    port: 31300,
                    nick: "wotseed01",
                    seeds: []
                },
                {
                    address: 'localhost',
                    port: 31301,
                    nick: "wotseed02",
                    seeds: [{ address: 'localhost', port: 31300 }]
                }
            ]
        }
    },
    //  The application database configuration. The ./data/dbs directory includes the database implementations
    //  where the db.js file implements the database functions`
    db: {
        type: 'file'
    }
};

module.exports = config;