// wsd.js - web socket client and server
// provides the bindings to web sockets

var exports = module.exports = {}

var url = require('url');
var logger = require('../../logger');
var config = require('../../config');
var thing_handler = require('../../libs/thing/thing_handler');
var thingevents = require('../../libs/events/thingevents');

// run the websocket server
var WebSocket = require('ws');
var WebSocketServer = WebSocket.Server;

var clientidcount = 1;

var proxies = {};

var wss = new WebSocketServer({
    port: config.servers.web.ws_port ?  config.servers.web.ws_port : 8080,
    path: '/webofthings'
});

logger.info('started web sockets server on port 8080');


wss.on('connection', function(ws) {
    var host = null;
    
    ws.clientid = clientidcount++;

    ws.on('message', function(message) {
        logger.debug('received: ' + message);

        try {
            var obj = JSON.parse(message);
            logger.debug("JSON parsed without error");
            dispatch(ws, obj);
        } catch (e) {
            logger.error("Error in handling " + message);
        }
    });

    ws.on('close', function() {
        logger.debug("--- ws closed ---");
        var id = ws.clientid;
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
        
        thing_handler.get_thing_async(thing_name, function (err, thing) {
            if (err) {
                send_error(ws, err);
            }
            else if (!thing) {
                send_error(ws, 'the thing is null');
            }
            else {
                var props = {};
                var names = thing.properties;
                
                for (var prop in names) {
                    if (names.hasOwnProperty(prop) && prop.substr(0, 1) !== "_")
                        props[prop] = thing.values[prop];
                }
                
                // return state of properties
                props["running"] = thing.running;
                
                var response = {
                    thing: thing_name,
                    state: props
                };
                
                ws.send(JSON.stringify(response));
            }
        });

    } 
    else if (message.patch) {
    	var uri = url.resolve(base_uri, message.uri);
        find_thing(uri, function (thing) {
        	thing[message.patch] = message.data;

        	// update other proxies for this thing
        	notify(message, ws);
        });
    } 
    else if (message.action) {
        thing_handler.get_thing_async(message.thing, function (err, thing) {
            if (err) {
                send_error(ws, err);
            }
            else if (!thing) {
                send_error(ws, 'the thing is null');
            }
            else {
                try {
                    thing[message.action](message.data);
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

// send message to all current connections with proxies for
// the same thing, but excluding the given client if provided
function notify(message, client) {
    var connections = proxies[message.uri];

    if (connections) {
        var notification = JSON.stringify(message);

        for (var i = 0; i < connections.length; ++i) {
            var ws = connections[i];

            if (client) {
                if (ws === client)
                    continue;
            }

            logger.debug("sending: " + notification);
            ws.send(notification);
        }
    }
}


thingevents.emitter.on('property_changed', function (payload) {
    try {
        var thing = payload.thing;
        var connections = proxies[thing];
        
        var notification = JSON.stringify(payload);

        for (var conn in connections) {
            logger.debug("sending: " + notification);
            var ws = connections[conn];
            ws.send(notification);            
        }
    }
    catch (e) {
        logger.error("property_changed error: " + e.message);
    }
});
