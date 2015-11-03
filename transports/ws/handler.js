// wsd.js - web socket client and server
// provides the bindings to web sockets

var exports = module.exports = {}

var url = require('url');
var logger = require('../../logger');
var thing_handler = require('../../libs/thing/thing_handler');
var thingevents = require('../../libs/events/thingevents');

var config = global.appconfig;

// run the websocket server
var WebSocket = require('ws');
var WebSocketServer = WebSocket.Server;

var clientidcount = 1;

var proxies = {};

function start(settings) {
    
    if (!settings || !settings.port) {
        throw new Error("Invalid web socket server configuration setttings, the web socket settings and port is required");
    }

    //  the web server is tarted by including the module declaration above
    logger.info('Initialising web socket server');

    var wss = new WebSocketServer({
        port: settings.port,
        path: '/webofthings'
    });
    
    logger.info('started web sockets server on port 8080');
    
    
    wss.on('connection', function (ws) {
        var host = null;
        
        ws.clientid = clientidcount++;
        
        ws.on('message', function (message) {
            logger.debug('received: ' + message);
            
            try {
                var obj = JSON.parse(message);
                logger.debug("JSON parsed without error");
                dispatch(ws, obj);
            } catch (e) {
                logger.error("Error in handling " + message);
            }
        });
        
        ws.on('close', function () {
            var id = ws.clientid;

            logger.debug("--- ws closed for client id " + id);
            
            // TODO remove from the proxies list
            for (name in proxies) {
                var collection = proxies[name];
                delete collection[id];
            }
        });
    });
    
    function register_proxy(name, ws) {
        logger.debug("wsd: registering proxy: " + name);
        
        if (!proxies[name]) {
            proxies[name] = {};
        }
        
        proxies[name][ws.clientid] = ws;
    }
    
    
    function send_error(ws, err) {
        var response = {
            error: err
        };
        ws.send(JSON.stringify(response));
    }
    
    function dispatch(ws, message) {
        logger.debug('received: ' + JSON.stringify(message));
        if (message.host) {
            logger.debug('connection from host ' + message.host);
            var host = message.host;
            connections[host] = ws;
        } else if (message.request) {
            // return the model 
            switch (message.request) {
                case "get_model":
                    if (!message.thing) {
                        return send_error(ws, 'the thing parameter is required to receive the model');
                    }
                    break;
                default:
                    // TODO send error of not implemented request
                    break;
            }
        } 
        else if (message.proxy) {
            // register this ws connection as a proxy so
            // we can notify events and property updates
            var thing_name = message.proxy;
            register_proxy(thing_name, ws);            
        } 
        else if (message.patch) {
            var thing_name = message.thing;
            thing_handler.get_thing_async(thing_name, function (err, thing) {
                if (err) {
                    return send_error(ws, err);
                }
                thing.patch(message.patch, message.data);
            });
        } 
        else if (message.action) {
            var thing_name = message.thing;
            var action = message.action;
            thing_handler.get_thing_async(thing_name, function (err, thing) {
                if (err) {
                    send_error(ws, err);
                }
                else if (!thing) {
                    send_error(ws, 'the thing is null');
                }
                else {
                    try {
                        thing[action](message.data);
                    }
                    catch (e) {
                        send_error(ws, e.message);
                    }
                }
            });
        } else if (message.error) {
            logger.error("received error message: " + error);
        } else {
            logger.debug("unknown message type: " + JSON.stringify(message));
            var response = {
                error: "unknown message type"
            };
            ws.send(JSON.stringify(response));
        }
    }
    
    
    thingevents.emitter.on('thingevent', function (event_name, payload) {
        try {
            switch (event_name) {
                case 'propertychange':
                case 'eventsignall':
                    var thing = payload.thing;
                    var connections = proxies[thing];
                    
                    var notification = JSON.stringify(payload);
                    
                    for (var conn in connections) {
                        //logger.debug("sending: " + notification);
                        var ws = connections[conn];
                        ws.send(notification);
                    }
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


exports.start = start;