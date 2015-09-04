var config = global.appconfig;

module.exports = function () {
    var appdb = null;
    
    // get from the config what database needs to be wired up
    var dbtype = config.db.type;
    if (!dbtype) {
        throw new Error('The application data database tyepe does not exists in the configuration file');
    }

    appdb = require('./dbs/' + dbtype + '/db');
    return appdb;
};

