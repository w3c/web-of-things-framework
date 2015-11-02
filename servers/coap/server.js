var logger = require('../../logger');
var coap = require('../../libs/transport/node-coap/');

var COAP_RESULT_SUCCESS = 0;
var COAP_ERROR_INVALID_REQUEST = 1;
var COAP_ERROR_INVALID_REQUEST_FUNC = 2;

var handle_patch = function (thing_name, payload, req, res) {
    try {
        var property = payload.patch;
        var value = payload.data;
        
        logger.debug('CoAP server received patch: ' + thing_name + ' property: ' + property);
        
        thing_handler.get_thing_async(thing_name, function (err, thing) {
            if (err) {
                return res.end(JSON.stringify({ "error": err }));
            }
            
            try {
                thing[property] = value;
                res.end(JSON.stringify({ "result": COAP_RESULT_SUCCESS }));
            }
            catch (e) {
                logger.error("Error in CoAP server handle_patch " + e.message);
            }
        });
            
    }
    catch (e) {
        logger.error("Error in CoAP server handle_patch " + e.message);
    }
};

var handle_eventsignall = function (thing_name, payload, req, res) {
    try {
        var event = payload.event;
        var data = payload.data;
        
        logger.debug('CoAP server received eventsignall: ' + thing_name + ' event: ' + event);
        
        thing_handler.get_thing_async(thing_name, function (err, thing) {
            if (err) {
                return res.end(JSON.stringify({ "error": err })); 
            }
            
            try {
                thing.raise_event(event, data);
                res.end(JSON.stringify({ "result": COAP_RESULT_SUCCESS }));
            }
            catch (e) {
                logger.error("Error in CoAP server handle_eventsignall " + e.message);
            }
        });
            
    }
    catch (e) {
        logger.error("Error in CoAP serverhandle_eventsignall " + e.message);
    }    
};

var listen = function (settings) {
    
    var server = coap.createServer();

    server.on('request', function (req, res) {
        if (!req.payload) {
            return res.end(JSON.stringify({ "error": COAP_ERROR_INVALID_REQUEST }));
        }

        var payload = req.payload;
        var thing = payload.thing;
        var func = payload.func;
        if (!thing || !func ) {
            return res.end(JSON.stringify({ "error": COAP_ERROR_INVALID_REQUEST }));
        }
        
        switch (func) {
            case "eventsignall":
                handle_eventsignall(thing, payload, req, res);
                break;
            case "patch":
                handle_patch(thing, payload, req, res);
                break;
            default:
                return res.end(JSON.stringify({ "error": COAP_ERROR_INVALID_REQUEST_FUNC }));
                break;
        }

        res.end(JSON.stringify({ "result": COAP_RESULT_SUCCESS }));
    });

    server.listen(settings.port, null, function () {
        logger.info(' CoAP server started on port ' + settings.port);
    });

};

exports.start = function start(settings) {
    
    if (!settings && !settings.port) {
        return logger.info('The CoAP server initialisation is not yet implemented');
    }

    logger.info('Starting CoAP server');

    listen(settings);
}