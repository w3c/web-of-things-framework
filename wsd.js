// wsd.js - web socket client and server
// provides the bindings to web sockets

var exports = module.exports = {}

var url = require('url');
var base = 'http://localhost:8888/wot/'; // base URI for models on this server

// run the websocket server
var WebSocket = require('ws'),
    WebSocketServer = WebSocket.Server,
    wss = new WebSocketServer({port: 8080, path: '/webofthings'});
    
console.log('started web sockets server on port 8080');
    
var things = {};
var proxies = {};
var connections = {};

function set_registry(map)
{
  things = map;
}

function register_proxy(uri, ws)
{
  uri = typeof uri == 'string' ? uri : uri.href;
  console.log("registering proxy: " + uri);
  if (!proxies[uri])
    proxies[uri] = [];
    
  proxies[uri].push(ws);
}

function find_thing(uri)
{
  var uri = url.resolve(base, uri);

  if (!things.hasOwnProperty(uri)) {
      return null;
  }
  return things[uri].thing;
}

function connect (host, succeed, fail)
{
  var ws = connections[host];
  
  if (ws)
  {
    succeed(ws);  // reuse existing connection
  }
  else // create new connection
  {
    console.log('opening web socket connection with ' + host);
    ws = new WebSocket('ws://' + host + ':8080/webofthings');
    
    ws.on ('open', function () {
      console.log('opened web socket connection with ' + host);
      connections[host] = ws;
      ws.send(JSON.stringify({ host: host }));
      succeed(ws);
    });
    
    ws.on ('close', function () {
      delete connections[host];
    });
    
    ws.on ('message', function (message) {
      console.log("received message from server: " + host + " " + message.data);
      try {
        var message = JSON.parse(message.data);
        dispatch_message(message);
      } catch (e) {
        console.log("JSON syntax error in " + message.data);
      }
    });
    
    ws.on ('error', function (e) {
      fail(e);
    });

  }
}

// dispatch message from web socket connection
function dispatch_message (message)
{
  var thing = find_thing(message.uri);

  if (!thing)
  {
    console.log("dispatch_message: unknown thing: " + message.uri);
    raise("dispatch_message: unknown thing: " + message.uri);
  }
    
  if (message.event)  // notify event to proxy
  {
    var observers = thing._observers[message.event];
      
    for (var i = 0; i < observers.length; ++i)
      observers[i](message.name, message.data);
  }
  else if (message.state)  // update all properties on proxy
  {
    var obj = message.state;
      
    for (var property in obj)
    {
      if (obj.hasOwnProperty(property))
      {
        thing._values[property] = obj[property];
      }
    }
  }
  else if (message.patch) // update named property on proxy
  {
    thing[message.patch] = message.data;
  }
  else
    console.log("unknown message type: " + JSON.stringify(message));
}
    
wss.on('connection', function(ws)
{
  var host = null;
    
  ws.on('message', function(message)
  {
    console.log('received: ' + message);

    message = JSON.parse(message);
    
    if (message.host)
    {
      host = message.host;
      connections[host] = ws;
    }
    else if (message.proxy)
    {
      // register this ws connection as a proxy so
      // we can notify events and property updates
      register_proxy(message.proxy, ws);

      var thing = find_thing(message.proxy);

      if (!thing)
      {
        console.log("on connection, proxy: unknown thing: " + message.proxy);
        return;
      }
      
      var props = {};
      var names = thing._properties;
      
      for (prop in names)
      {
        if (names.hasOwnProperty(prop) && prop.substr(0, 1) !== "_")
          props[prop] = thing._values[prop];
      }
      
      props["_running"] = thing._running;
      
      var response = {
        uri: message.proxy,
        state: props
      };

      ws.send(JSON.stringify(response));
    }
    else if (message.patch)
    {
      var thing = find_thing(message.uri);

      if (!thing)
      {
        console.log("on connection, patch: unknown thing: " + message.uri);
        return;
      }
      
      thing[message.patch] = message.data;
      
      // update other proxies for this thing
      notify(message, ws);
    }
    else if (message.action)
    {
      var thing = find_thing(message.uri);

      if (!thing)
      {
        console.log("on connection, action: unknown thing: " + message.uri);
        return;
      }
      
      var result = thing[message.action](message.data);
      
      if (result && message.call)
      {
        var response = {};
        response.uri = message.uri;
        response.call = message.call;
        response.data = result;
        ws.send(JSON.stringify(response));
      }
    }
    else
      console.log("unknown message type: " + JSON.stringify(message));
  });

  ws.on('close', function ()
  {
    delete connections[host];
  });
});

// send message to all current connections with proxies for
// the same thing, but excluding the given client if provided
function notify(message, client)
{
  var connections = proxies[message.uri];
  
  if (connections)
  {
    var notification = JSON.stringify(message);
 
    for (var i = 0; i < connections.length; ++i)
    {
      var ws = connections[i];

      if (client)
      {
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
