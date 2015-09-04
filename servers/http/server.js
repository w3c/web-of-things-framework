var config = require('../../config');
var logger = require('../../logger');
var restify = require('restify');
var thing_handler = require('../../libs/thing/thing_handler');
var thingevents = require('../../libs/events/thingevents');
var db = require('../../data/db')();

exports.start = function start(settings) {
    logger.info('Start the HTTP REST server');
    
    if (!config.servers || !config.servers.http || !config.servers.http.port) {
        return logger.error("The http server port configuration data is missing");   
    }

    var port = config.servers.http.port;

    var server = restify.createServer();
    server
        .use(restify.fullResponse())
        .use(restify.bodyParser());
    
    server.post('/api', function create(req, res, next) {
        try {
            var request = req.params;
            logger.info('/api received request ' + request);
        }
        catch (e) {
            logger.error("");
        }
    });
    
    server.post('/api/thing/property/get', function create(req, res, next) {
        try {
            var request = req.params;
            if (!request || !request.thing || !request.property) {
                return next(new Error('property get  error: invalid parameters'));
            }  
            var thing_name = request.thing;
            var property = request.property;
            
            logger.debug('/api/property/get received request thing: ' + thing_name + ' property: ' + property);

            thing_handler.get_thing_async(thing_name, function (err, thing) {
                if (err) {
                    return next(new Error('property get error: ' + err));
                }
                
                var value = thing[property];
                res.send(200, { thing: thing_name, property: property, value: value });
            });
        }
        catch (e) {
            next(new Error('property get error: ' + e.message));
            logger.error("Error in /api/property/get " + e.message);
        }
    });

    server.post('/api/endpoint/register', function create(req, res, next) {
        try {
            var request = req.params;
            if (!request || !request.endpoint || !request.thing) {
                return next(new Error('endpoint register error: invalid parameters'));   
            }

            var endpoint = request.endpoint;
            var thing = request.thing;
            
            logger.debug('/api/endpoint/register received request endpoint: ' + endpoint + ' thing: ' + thing);
            
            // register this thing and endpoint
            db.register_endpoint(thing, endpoint, function (err, result) {
                if (err) {
                    return next(new Error('endpoint register error: ' + err));
                }

                res.send(200, { result: result });
            });
        }
        catch (e) {
            next(new Error('endpoint register error: ' + e.message));
            logger.error("Error in /api/property/get " + e.message);
        }
    });

    server.listen(port, function () {
        logger.info('HTTP REST server is listening on port ' + port);
    });

    // listen on the thing events and send it to the registered endpoints

}