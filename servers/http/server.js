var logger = require('../../logger');
var restify = require('restify');
var thing_handler = require('../../libs/thing/thing_handler');
var thingevents = require('../../libs/events/thingevents');
var db = require('../../data/db')();

var config = global.appconfig;

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
    
    
    server.post('/api/thing/action', function create(req, res, next) {
        try {
            var request = req.params;
            if (!request || !request.thing || !request.action ) {
                return next(new Error('thing patch  error: invalid parameters'));
            }
            var thing_name = request.thing;
            var action = request.action;
            var data = request.data;
            
            logger.debug('/api/thing/action received request thing: ' + thing_name + ' action: ' + action);
            
            thing_handler.get_thing_async(thing_name, function (err, thing) {
                try {
                    if (err) {
                        return next(new Error('action invoke error: ' + err));
                    }
                    
                    thing[action](data);
                    res.send(200, { result: true });
                    return next();
                }
                catch (e) {
                    next(new Error('thing action error: ' + e.message));
                    logger.error("Error in /api/thing/action " + e.message);
                }
            });
        }
        catch (e) {
            next(new Error('thing patch error: ' + e.message));
            logger.error("Error in /api/thing/patch " + e.message);
        }
    });
    
    server.post('/api/thing/patch', function create(req, res, next) {
        try {
            var request = req.params;
            if (!request || !request.thing || !request.patch || request.value == undefined) {
                return next(new Error('thing patch  error: invalid parameters'));
            }
            var thing_name = request.thing;
            var property = request.patch;
            var value = request.value;
            
            logger.debug('/api/patch received request thing: ' + thing_name + ' property: ' + property + ' value: ' + value);
            
            thing_handler.get_thing_async(thing_name, function (err, thing) {
                try {
                    if (err) {
                        return next(new Error('patch invoke error: ' + err));
                    }
                    
                    thing.patch(property, value);
                    res.send(200, { result: true });
                    return next();
                }
                catch (e) {
                    next(new Error('thing patch error: ' + e.message));
                    logger.error("Error in /api/thing/patch " + e.message);
                }
            });
        }
        catch (e) {
            next(new Error('thing patch error: ' + e.message));
            logger.error("Error in /api/thing/patch " + e.message);
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
                return next();
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
                return next();
            });
        }
        catch (e) {
            next(new Error('endpoint register error: ' + e.message));
            logger.error("Error in /api/property/get " + e.message);
        }
    });
    
    server.post('/api/thing/propertychange', function create(req, res, next) {
        try {
            var request = req.params;
            if (!request || !request.thing || !request.patch || request.data == undefined) {
                return next(new Error('/api/thing/propertychange error: invalid parameters'));
            }
            var thing_name = request.thing;
            var property = request.patch;
            var value = request.data;

            //logger.debug('/api/thing/propertychange received request thing: ' + thing_name + ' property: ' + property);
            
            thing_handler.get_thing_async(thing_name, function (err, thing) {
                if (err) {
                    return next(new Error('property get error: ' + err));
                }
                
                thing[property] = value;
                res.send(200, { result: true });
                return next();
            });
        }
        catch (e) {
            next(new Error('endpoint propertychange error: ' + e.message));
            logger.error("Error in /api/property/get " + e.message);
        }
    });
    
    
    server.post('/api/thing/eventsignall', function create(req, res, next) {
        try {
            var request = req.params;
            if (!request || !request.thing || !request.event) {
                return next(new Error('/api/thing/eventsignall error: invalid parameters'));
            }
            var thing_name = request.thing;
            var event = request.event;
            var data = request.data;
            
            //logger.debug('/api/thing/eventsignall received request thing: ' + thing_name + ' property: ' + property);
            
            thing_handler.get_thing_async(thing_name, function (err, thing) {
                if (err) {
                    return next(new Error('property get error: ' + err));
                }
                
                try {
                    thing.raise_event(event, data);
                    res.send(200, { result: true });
                    return next();
                }
                catch (e) {
                    next(new Error('endpoint eventsignall error: ' + e.message));
                    logger.error("Error in /api/property/get " + e.message);
                }
            });
            
        }
        catch (e) {
            next(new Error('endpoint eventsignall error: ' + e.message));
            logger.error("Error in /api/thing/eventsignall " + e.message);
        }
    });

    server.listen(port, function () {
        logger.info('HTTP REST server is listening on port ' + port);
    });
    
    //
    //  Listen on the thing events and send it to the registered endpoints
    //  All transport handler (web socket, this HTTP, etc. must implement this event handler listener to get notification
    //  from thing about property changes and events happened on the thing
    //  
    thingevents.emitter.on('thingevent', function (event_name, payload) {
        try {
            switch (event_name) {
                case 'propertychange':
                case 'eventsignall':
                    var thing = payload.thing;
                    //logger.debug("http end point handler signalled for " + thing);
                    // get the endpoints from the database
                    db.endpoint_list(thing, function (err, endpoints) {
                        try {
                            if (err) {
                                return logger.error('endpoint_list error: ' + err);
                            }
                            
                            if (!endpoints || !endpoints.length) {
                                //logger.debug("no endpoint is listening" );
                                return;
                            }
                            
                            for (i = 0; i < endpoints.length; i++) {
                                var url = endpoints[i];
                                var client = restify.createJsonClient({
                                    url: url,
                                    version: '*',
                                    agent: false
                                });
                                var path = '/api/thing/' + event_name;            
                                client.post(path, payload, function (err, req, res, data) {
                                    if (err) {
                                        return logger.error("Error in sending to /api/thing: " + err);
                                    }
                                    
                                    if (!data || !data.result) {
                                        logger.error("Error in in sending to /api/thing");
                                    }

                                    client.close();
                                });
                            }                
                        }
                        catch (e) {
                            logger.error("Error in in sending to /api/thing/ " + e.message);
                        }                                
                    });
                    break;
                default:
                    logger.error("handler for " + event_name + " is not implemented");
                    break;
            }
        }
        catch (e) {
            logger.error("thingevent error in processing " + event_name + ": " + e.message);
        }
    });
}