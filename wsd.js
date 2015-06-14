// wsd.js - web socket client and server
// provides the bindings to web sockets

var exports = module.exports = {}

var os = require('os'),
   hostname = os.hostname();
   
var url = require('url');

var base = 'http://localhost:8888/wot/'; // base URI for models on this server

// run the websocket server
var WebSocket = require('ws'),
    WebSocketServer = WebSocket.Server,
    wss = new WebSocketServer({
        port: 8080,
        path: '/webofthings'
    });

console.log('started web sockets server on port 8080');

var things = {};
var proxies = {};
var connections = {};

function set_registry(map) {
    things = map;
}

function local_hostname() {
    return hostname;
}

function register_proxy(uri, ws) {
    uri = typeof uri == 'string' ? uri : uri.href;
    console.log("wsd: registering proxy: " + uri);
    if (!proxies[uri])
        proxies[uri] = [];

    proxies[uri].push(ws);
}

// asynchronous on account of need to check external host names for this server
function find_thing(uri, succeed, fail) {
    var uri = url.resolve(base, uri);

    if (!things.hasOwnProperty(uri)) {
        var options = url.parse(uri);
        var uri1 = options.href;
        
        if (things[uri1] && things[uri1].thing) {
            succeed(things[uri1].thing);
        }
        else // is its hostname for this server?
        {
            islocal.test(options.hostname,
                function() {
                    // it's local so its compute localhost uri
                    options.hostname = 'localhost';
                    var uri2 = url.format(options);
                    var thing = things[uri2];
                
                    if (things[uri2] && things[uri2].thing) {
                        things[uri1] = things[uri2].thing;
                        succeed(things[uri2].thing);
                    } else {
                        // *** we need to defer the response to the client -- FIX ME ***                
                        fail("the thing you want to proxy is not yet registered");
                    }
                },
                function() {
                    // it's a remote host so we can't handle it
                    fail("this server can't handle proxies for things on other servers: " + options.href)
                },
                function() {
                    // unknown host name
                    fail("server couldn't determine IP address for " + options.hostname);
            });
        }
    }
    
    succeed(things[uri].thing);
}

function connect(host, succeed, fail) {
    var ws = connections[host];

    if (ws) {
        succeed(ws); // reuse existing connection
    } else // create new connection
    {
        console.log('opening web socket connection with ' + host);
        ws = new WebSocket('ws://' + host + ':8080/webofthings');

        ws.on('open', function() {
            console.log('opened web socket connection with ' + host);
            connections[host] = ws;
            ws.send(JSON.stringify({
                host: host
            }));
            succeed(ws);
        });

        ws.on('close', function() {
            delete connections[host];
        });

        ws.on('message', function(message, flags) {
            console.log("received message from server: " + host + " " + message);
            try {
                var obj = JSON.parse(message);
                dispatch(ws, obj);
            } catch (e) {
                console.log("Error in handling" + message);
            }
        });

        ws.on('error', function(e) {
            fail(e);
        });
    }
}

wss.on('connection', function(ws) {
    var host = null;

    ws.on('message', function(message) {
        console.log('received: ' + message);

        try {
            var obj = JSON.parse(message);
            console.log("JSON parsed without error");
            dispatch(ws, obj);
        } catch (e) {
            console.log("Error in handling " + message);
        }
    });

    ws.on('close', function() {
        delete connections[host];
    });
});

function dispatch(ws, message) {
    if (message.host) {
        var host = message.host;
        connections[host] = ws;
    } else if (message.proxy) {
        // register this ws connection as a proxy so
        // we can notify events and property updates
        register_proxy(message.proxy, ws);

        var thing = find_thing(message.proxy);

        if (!thing) {
            console.log("on connection, proxy: unknown thing: " + message.proxy);
            var response = {
                error: "unknown thing for get"
            };
            ws.send(JSON.stringify(response));
            return;
        }

        var props = {};
        var names = thing._properties;

        for (prop in names) {
            if (names.hasOwnProperty(prop) && prop.substr(0, 1) !== "_")
                props[prop] = thing._values[prop];
        }

        // return state of properties
        props["_running"] = thing._running;

        var response = {
            uri: message.proxy,
            state: props
        };

        ws.send(JSON.stringify(response));
    } else if (message.patch) {
        var thing = find_thing(message.uri);

        if (!thing) {
            console.log("on connection, patch: unknown thing: " + message.uri);
            var response = {
                error: "unknown thing for patch"
            };
            ws.send(JSON.stringify(response));
            return;
        }

        thing[message.patch] = message.data;

        // update other proxies for this thing
        notify(message, ws);
    } else if (message.action) {
        var thing = find_thing(message.uri);

        if (!thing) {
            console.log("on connection, action: unknown thing: " + message.uri);
            var response = {
                error: "unknown thing for action"
            };
            ws.send(JSON.stringify(response));
            return;
        }

        var result = thing[message.action](message.data);

        if (result && message.call) {
            var response = {};
            response.uri = message.uri;
            response.call = message.call;
            response.data = result;
            ws.send(JSON.stringify(response));
        }
    } else if (message.error) {
        console.log("received error message: " + error);
    } else {
        console.log("unknown message type: " + JSON.stringify(message));
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

            console.log("sending: " + notification);
            ws.send(notification);
        }
    }
}

exports.local_hostname = local_hostname;
exports.set_registry = set_registry;
exports.notify = notify;
exports.register_proxy = register_proxy;
exports.find_thing = find_thing;
exports.connect = connect;