// wot-framework.js
var exports = module.exports = {};

var fs = require('fs');
var url = require('url');
var http = require('http');
var httpd = require('./httpd.js');  // launch the http server
var wsd = require('./wsd.js');  // launch the web sockets server
var base = 'http://localhost:8888/wot/'; // base URI for models on this server
var pending = {};  // mapping from uri to list of things with unresolved dependencies

// registry of locally hosted things with mapping from thing id to model, implementation and status
var registry = {};

httpd.set_registry(registry);  // pass reference to http server so it can serve up models

// create new thing given its unique name, model and implementation
function thing (name, model, implementation)
{
  console.log("creating: " + name);

  var uri = url.resolve(base, name);
  
  var thing = new function Thing () {
    this._name = name;
    this._uri = uri;
    this._model = model;
    this._observers = {};
    this._properties = {};
    this._values = {};
    this._running = false;
    this._implementation = implementation;
    registry[uri] = { model: model, thing: this };
 
    init_events (this);
    init_properties (this);
    init_actions (this);
    init_dependencies (this);
  };
  
  // if no dependencies, start the new thing now if not already running
      
  if (thing._unresolved == 0 && !thing._running)
  {
    console.log("starting1: " + name);
    implementation.start(thing);
    thing._running = true;
  }
}

// create a proxy for a thing on a remote server
// will call handler(thing) once thing is ready
// handler is null if called from init_dependencies
function register_proxy (uri, handler)
{
  var options = url.parse(uri);
  
  if (!options.host)
  {
    options.host = "localhost";
    options.port = 8888;
  }
  
  // is this thing hosted by this server?
  
  // *** this test is insufficient -- please fix me ***
  if (options.port = 8888 && 
       (options.host === "localhost" ||
        options.host === '127.0.0.1')) {
    return record_proxy(options.pathname, handler);
  }
  
  // otherwise on a remote server, so use HTTP to retrieve model
  
  return http.get (options, function(response) {
      var body = '';
      response.on('data', function(d) {
        body += d;
      });
  
    response.on('end', function() {
      try {
        var model = JSON.parse(body);
        
        // now get a socket for the remote server
        // first check if one already exists
        
        var ws = sockets[url.format(options)];
        
        if (ws)
          create_proxy(uri, model, ws, handler);
        else // we need to open a connection
        {    
          ws = new WebSocket('ws://www.host.com/path');
          
          ws.on('open', function() {
            sockets[options.host] = ws;
            create_proxy(uri, model, ws, handler);
          });
          
          ws.on('message', function(message) {
            console.log('received: %s', message);
          });
          
          ws.on('close', function(message) {
            delete framework.sockets[options.host];
            
          });
        }
      } catch (e) {
        fail ("couldn't load " + uri + ", " + e);
      }
    });
  
    response.on('error', function(err) {
      fail ("couldn't load " + uri + ", error: " + err);
    });
  });
}

function unregister_proxy(uri)
{
  // *** implement me *** needs to remove proxy from list of proxies for given uri
  console.log("*** unregister_proxy isn't implemented");
}

function create_proxy(uri, model, ws, handler)
{
  console.log("register proxy: " + uri);
  
  var thing = new function Proxy () {
    this._uri = uri;
    this._model = model;
    this._observers = {};
    this._properties = {};
    this._values = {};
    this._running = false;
    registry[uri] = { model: model, thing: this };
 
    init_events (this);
    init_properties (this);
    init_actions (this);
    init_dependencies (this);
  };
    
  // register the new proxy
  wsc.things[uri] = thing;
  wsc.register_proxy(uri, ws);
      
  // now register proxy with the thing it proxies for
    
  var message = {
    proxy: thing._uri
  };
    
  ws.send(JSON.stringify(message));
  console.log("registered: " + thing._uri);
}

// *** not finished -- please fix me ***
function record_proxy (pathname, handler)
{
  console.log("*** record_proxy isn't implemented");
  
  // when the corresponding thing is set up
  // pass it to the given handler
  if (/^\/wot\/.+/.test(pathname))
  {
    var id = pathname.substr(5);
    console.log('seeking thing for id: ' + id);
  }
}

function notify_dependents (dependee)
{
  console.log('notify dependents on ' + dependee._name);
  var dependents = pending[dependee._name];
  
  if (dependents)
  {
    var s = "";
    for (var i = 0; i < dependents.length; ++i)
      s += dependents[i].dependent._name + ' ';
    console.log('dependents are: ' + s);
  }
  else
    console.log('no dependents');
  
  if (dependents)
  {
    for (var i = 0; i < dependents.length; ++i)
    {
      var dependency = dependents[i];
      var thing = dependency.dependent;
      var property = dependency.property;
      resolve_dependency(thing, property, dependee)
    }
  
    delete pending[dependee._name];
  }
}

// dependent is a thing, property is the property name for the dependee
// and dependee is the *name*  for the thing this thing is depending on
function record_dependency(dependent, property, dependee)
{
  if (!pending[dependee])
  	pending[dependee] = [];
  	
  pending[dependee].push({property: property, dependent: dependent});
}

function resolve_dependency(thing, property, dependee)
{
  console.log('setting ' +  thing._name + "'s " + property + " to " + dependee._name);
  thing[property] = dependee;
  
  if (--thing._unresolved <= 0)
  {
    console.log("starting2: " + thing._name);
    thing._implementation.start(thing);
    thing._running = true;
  }
}

// resolve all dependencies for this thing
// these could be local things on this server
// otherwise we need to create proxies for them
// a given dependency must only be given once
function init_dependencies(thing)
{
  var dependencies = thing._model["@dependencies"];
  var name, count = 0;
  
  // first count the number of dependencies
  for (name in dependencies)
  {
    if (dependencies.hasOwnProperty(name))
      ++count;
  }
  
  thing._unresolved = count;

  for (name in dependencies)
  {
    if (dependencies.hasOwnProperty(name))
    {
      var uri = dependencies[name];
      console.log("dependee: " + uri);
      
      uri = url.resolve(thing._uri, uri)
      var entry = registry[uri];
      
      if (entry)
        resolve_dependency(thing, name, entry.thing);
      else
      {
        record_dependency(thing, name, uri);
        
        // create proxy if uri is for a remote thing
        proxy(uri);
      }
    }
  }
  
  // some things may be waiting for this thing
  notify_dependents(thing);
}

function init_events(thing)
{
  var events = thing._model["@events"];
 
  thing._raise_event = function(name, data) {
    var message = {
      uri: thing._uri,
      event: name,
      data: data
    }
    
    wsd.notify(message);
  };

  for (var ev in events)
  {
    if (events.hasOwnProperty(ev))
      thing._observers[ev] = [];
  }
  
  thing._observe = function (name, handler) { 
    var observers = thing._observers[name];
      
    // check handler is a function
      
    if (! (handler && getClass.call(handler) == '[object Function]') )
      throw("event handler is not a function");
      
    // if observers is null, an illegal event name
    
    if (!observers)
      throw("undefined event name");
      
    // check if this handler is already defined
      
    for (var i = 0; i < observers.length; ++i)
    {
      if (observers[i] == handler)
        return;
    }
      
    observers.push(handler);
  };
          
  thing._unobserve = function (name, handler) {
    var observers = thing._observers[name];
      
    // check handler is a function
      
    if (! (handler && getClass.call(handler) == '[object Function]') )
      throw("event handler is not a function");
      
    // if observers is null, an illegal event name
      
    if (!observers)
      throw("undefined event name");
      
    // search for this handler
      
    for (var i = 0; i < observers.length; ++i)
    {
      if (observers[i] == handler)
      {
        delete observers[i];
        return;
      }
    }
  };
}
  
// initialise thing's getters and setters
// if ws is null, thing isn't a proxy and hence
// we need to notify property changes to its proxies
function init_properties (thing, ws)
{
  // initialise getters and setters for properties
  // this doesn't yet validate property values
  // it also assumes all properties are writable (bad!)
  
  var properties = thing._model["@properties"];
      
  if (ws)
  {     
    for (var prop in properties)
    {
      if (properties.hasOwnProperty(prop))
      {
        thing._properties[prop] = null;
        Object.defineProperty(thing, prop, {
          get: function () {
            return thing._values[prop];
          },
        
          set: function (value) {
            thing._values[prop] = value;
            var message = {
              uri: thing._uri,
              patch: prop,
              data: value
            };
          
            ws.send(JSON.stringify(message));
          }
        });
      }
    }
  }
  else // local thing so notify all of its proxies
  {
    for (var prop in properties)
    {
      if (properties.hasOwnProperty(prop))
      {
        thing._properties[prop] = null;
        Object.defineProperty(thing, prop, {
          get: function () {
            return thing._values[prop];
          },
        
          set: function (value) {
            console.log("setting " + thing._name + "." + prop + " = " + value);
            thing._values[prop] = value;
            
            var message = {
              uri: thing._uri,
              patch: prop,
              data: value
            };
            
            wsd.notify(JSON.stringify(message));
          }
        });
      }
    }
  }
}

// initialise thing's actions
// if ws is null, thing is local and we need
// to bind the actions to the implementation
function init_actions (thing, ws)
{
  // set up methods for invoking actions on proxied thing
  // this doesn't yet validate the action's data
  // this doesn't yet support results returned by actions
  // which would need to be handled asynchronously
  // most likely via returning a Promise for the result
    
  var actions = thing._model["@actions"];

  if (ws) // proxied thing so pass to remote thing
  {
    for (var act in actions)
    {
      if (actions.hasOwnProperty(act))
      {
        thing[act] = function (data) {
          var message = {
            uri: thing._uri,
            action: act,
            data: data
          };
          
          ws.send(JSON.stringify(message));
        };
      }
    }
  }
  else // local thing so invoke implementation
  {
    for (var act in actions)
    {
      if (actions.hasOwnProperty(act))
      {
        thing[act] = function (data) {
          thing._implementation[act](thing, data);
        }
      }
    }
  }
}

exports.thing = thing;
exports.proxy = register_proxy;
