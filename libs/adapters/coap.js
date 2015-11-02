var logger = require('../../logger');
var coap = require('coap');

exports.init = function init(adapter, callback) {
    logger.info('CoAP adapter init');

    if (!adapter || !adapter.device || adapter.protocol != "coap" || !adapter.host) {
        return callback("Invalid CoAP adapter configuration parameters");
    }
    
    // TODO more initialisation, loging, audit here

    callback(null);
}


exports.unbind = function unbind(callback) {
    logger.info('CoAP adapter unbind');
    
    callback(null);
}


exports.send = function action(url, msg, callback) {
    try {
        logger.info('CoAP adapter send message');
        
        var req = coap.request(url)
        
        req.write(JSON.stringify(msg));
        
        req.on('response', function (res) {
            try {
                // return only the payload
                var payload = res && res.payload && res.payload.length ? JSON.parse(res.payload.toString()) : null;
                if (payload) {
                    callback(null, payload);
                }
                else {
                    callback("Invaid COAP pyalod in response");
                }
            }
            catch (err) {
                logger.info('CoAP adapter response handler error: ' + err.message);
            }
        })
        
        req.end();
    }
    catch (e) {
        logger.info('CoAP adapter send error: ' + e.message);
    }
}





