var logger = require('../../logger');

exports.init = function init(adapter, callback) {
    logger.info('CoAP adapter init');

    if (!adapter || !adapter.device || adapter.protocol != "coap" || !adapter.uri) {
        return callback("Invalid CoAP adapter configuration parameters");
    }

    callback(null);
}


exports.unbind = function unbind(callback) {
    logger.info('CoAP adapter unbind');
    
    callback(null);
}


exports.action = function action(msg, callback) {
    logger.info('CoAP adapter action');
    
    callback(null);
}


exports.patch = function patch(msg, callback) {
    logger.info('CoAP adapter patch');
    
    callback(null);
}




