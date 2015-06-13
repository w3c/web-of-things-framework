// wsd.js - web socket client and server
// provides the bindings to web sockets

var exports = module.exports = {}

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

function register_proxy(uri, ws) {
    uri = typeof uri == 'string' ? uri : uri.href;
    console.log("registering proxy: " + uri);
    if (!proxies[uri])
        proxies[uri] = [];

    proxies[uri].push(ws);
}

function find_thing(uri) {
    var uri = url.resolve(base, uri);

    if (!things.hasOwnProperty(uri)) {
        return null
    }
    return things[uri].thing;
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

exports.set_registry = set_registry;
exports.notify = notify;
exports.register_proxy = register_proxy;
exports.find_thing = find_thing;
exports.connect = connect;