var logger = require('../config');

module.exports = function () {
    var appdb = null;
    
    // get from the config what database needs to be wired up

    appdb = require('./dbs/file/db');
    return appdb;
};

