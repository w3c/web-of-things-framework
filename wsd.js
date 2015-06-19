// wsd.js - web socket client and server
// provides the bindings to web sockets

var exports = module.exports = {}

var os = require('os'),
    hostname = os.hostname();

var url = require('url');

var base_uri;

var ChannelFactory = require('./channels/factory.js');
var WebSocketChannel = require('./channels/ws/ws.js');

function register_base_uri(uri) {
    base_uri = uri;
}

// run the websocket server
var WebSocketServer = require('ws').Server,
    wss = new WebSocketServer({
        port: 8080,
        path: '/webofthings'
    });

console.log('started web sockets server on port 8080');

var things = {}; // 
var proxies = {};
var connections = {};
var pending = {};

function register_continuation(uri, method, context) {
    if (!pending[uri])
        pending[uri] = [];

    pending[uri] = {
        method: method,
        context: context
    };
}

// used to call continuations pending on a local thing being registered
function register_thing(thing) {
    var context, continuation, continuations = pending[thing._uri];

    console.log('wsd: registering thing ' + thing._uri);
    things[thing._uri] = thing;

    if (continuations) {
        for (var i = 0; i < continuations.length; ++i) {
            continuation = continuations[i];
            continuations.method(thing, continuation.context);
        }

        delete pending[things._uri];
    }
}

function register_proxy(uri, channel) {
    uri = typeof uri == 'string' ? uri : uri.href;
    console.log("wsd: registering proxy: " + uri);
    if (!proxies[uri])
        proxies[uri] = [];

    proxies[uri].push(channel);
}

// asynchronous because the thing may not yet have been created
function find_thing(uri, method, context) {
    var uri = url.resolve(base_uri, uri);
    var options = url.parse(uri);
    var uri = options.href;

    // is it already registered?
    if (things[uri] && things[uri].thing) {
        method(things[uri].thing, context);
    } else // it is not yet registered
    {
        options.hostname = 'localhost';
        uri = url.format(options);
        register_continuation(uri, method, context);
    }
}

function connect(host, succeed, fail) {
    var channel = connections[host];

    if (channel) {
        succeed(channel); // reuse existing connection
    } else // create new connection
    {
        console.log('opening web socket connection with ' + host);
        var uri = 'ws://' + host + ':8080/webofthings';
        ChannelFactory.get(uri,
            function(channel) {
                channel.on(channel.message.open, function() {
                    console.log('opened web socket connection with ' + host);
                    connections[host] = channel;
                    // now let other server know our hostname
                    channel.send({
                        host: os.hostname()
                    });
                    succeed(channel);
                });

                channel.on(channel.message.close, function() {
                    delete connections[host];
                });

                channel.on(channel.messages.message, function(message) {
                    console.log("received message from server: " + host + " " + message);
                    try {
                        var obj = JSON.parse(message);
                        dispatch(channel, obj);
                    } catch (e) {
                        console.log("Error in handling" + message);
                    }
                });

                channel.on(channel.messages.error, function(e) {
                    fail(e);
                });

            },
            function(err) {

            })
    }
}

wss.on('connection', function(ws) {
    var host = null;

    var channel = new WebSocketChannel(undefined, ws);

    channel.on(channel.messages.message, function(message) {
        console.log('received: ' + message);

        try {
            var obj = JSON.parse(message);
            console.log("JSON parsed without error");
            dispatch(channel, obj);
        } catch (e) {
            console.log("Error in handling " + message);
        }
    });

    channel.on(channel.messages.close, function() {
        delete connections[host];
    });
});

function dispatch(channel, message) {
    console.log('received: ' + JSON.stringify(message));
    if (message.host) {
        console.log('connection from host ' + message.host);
        var host = message.host;
        connections[host] = channel;
    } else if (message.proxy) {
        // register this ws connection as a proxy so
        // we can notify events and property updates
        var uri = url.resolve(base_uri, message.proxy);
        register_proxy(uri, channel);

        find_thing(uri, function(thing) {
            var props = {};
            var names = thing._properties;

            for (var prop in names) {
                if (names.hasOwnProperty(prop) && prop.substr(0, 1) !== "_")
                    props[prop] = thing._values[prop];
            }

            // return state of properties
            props["_running"] = thing._running;

            var response = {
                uri: message.proxy,
                state: props
            };

            channel.send(response);
        });
    } else if (message.patch) {
        var uri = url.resolve(base_uri, message.uri);
        find_thing(uri, function(thing) {
            thing[message.patch] = message.data;

            // update other proxies for this thing
            notify(message, channel);
        });
    } else if (message.action) {
        var uri = url.resolve(base_uri, message.uri);
        find_thing(uri, function(thing) {
            var result = thing[message.action](message.data);

            if (result && message.call) {
                var response = {};
                response.uri = uri;
                response.call = message.call;
                response.data = result;
                channel.send(response);
            }
        });
    } else if (message.error) {
        console.log("received error message: " + error);
    } else {
        console.log("unknown message type: " + JSON.stringify(message));
        var response = {
            error: "unknown message type"
        };
        channel.send(response);
    }
}

// send message to all current connections with proxies for
// the same thing, but excluding the given client if provided
function notify(message, client) {
    var connections = proxies[message.uri];

    if (connections) {
        for (var i = 0; i < connections.length; ++i) {
            var channel = connections[i];

            if (client) {
                if (channel === client)
                    continue;
            }

            channel.send(channel);
        }
    }
}

exports.connect = connect;
exports.notify = notify;
exports.register_thing = register_thing;
exports.register_proxy = register_proxy;
exports.register_base_uri = register_base_uri;