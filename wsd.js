// wsd.js - web socket client and server
// provides the bindings to web sockets

var exports = module.exports = {}

var os = require('os'), hostname = os.hostname();
   
var url = require('url');

function register_base_uri(uri) {
	base_uri = uri;
}

// run the websocket server
var WebSocket = require('ws'),
    WebSocketServer = WebSocket.Server,
    wss = new WebSocketServer({
        port: 8080,
        path: '/webofthings'
    });

console.log('started web sockets server on port 8080');

var things = {};  // 
var proxies = {};
var connections = {};
var pending = {};

function register_continuation(uri, method, context) {
  if (!pending[uri])
      pending[uri] = [];
      
  pending[uri ] = { method: method, context: context };
}

// used to call continuations pending on a local thing being registered
function register_thing(thing) {
    var context, continuation, continuations = pending[thing._uri];
    
    if (continuations) {
        for (var i = 0; i < continuations.length; ++i) {
            continuation = continuations[i];
            continuations.method(thing, contination.context);
        }
          
        delete pending[things._uri];
    }
}

function register_proxy(uri, ws) {
    uri = typeof uri == 'string' ? uri : uri.href;
    console.log("wsd: registering proxy: " + uri);
    if (!proxies[uri])
        proxies[uri] = [];

    proxies[uri].push(ws);
}

// asynchronous because the thing may not yet have been created
function find_thing(uri, method, context) {
    var uri = url.resolve(base_uri, uri);
    var options = url.parse(uri);
    var uri = options.href;
        
    // is it already registered?
    if (things[uri] && things[uri].thing) {
        method(things[uri].thing, context);
    }
    else // it is not yet registered
    {
        options.hostname = 'localhost';
        uri = url.format(options);
        register_continuation(uri, method, context);
    }
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
            // now let other server know our hostname
            ws.send(JSON.stringify({
                host: os.hostname()
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

exports.connect = connect;
exports.notify = notify;
exports.register_thing = register_thing;
exports.register_proxy = register_proxy;
exports.register_base_uri = register_base_uri;
