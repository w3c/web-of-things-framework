var restify = require('restify');
var logger = require('../../logger');


exports.init = function init(adapter, callback) {
    logger.info('HTTP adapter init');
    
    if (!adapter || !adapter.device || adapter.protocol != "http" || !adapter.host) {
        return callback("Invalid CoAP adapter configuration parameters");
    }
    
    // TODO more initialisation, loging, audit here
    
    callback(null);
}


exports.unbind = function unbind(callback) {
    logger.info('CoAP adapter unbind');
    
    callback(null);
}


exports.send = function action(url, path, msg, callback) {
    try {
        logger.info('HTTP adapter send message');
        
        var client = restify.createJsonClient({
            url: url,
            version: '*',
            agent: false
        });
        

        client.post(path, msg, function (err, req, res, data) {
            if (err) {
                callback("HTTP adapter " + path + " error: " + err);
            }            
            else if (!data) {
                callback("HTTP adapter " + path + " invalid result");
            }
            else {
                callback(null, data);   
            }
            
            client.close();
        });       
        
    }
    catch (e) {
        logger.info('HTTP adapter send error: ' + e.message);
    }
}





