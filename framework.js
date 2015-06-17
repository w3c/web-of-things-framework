// wot-framework.js
var exports = module.exports = {};

var assert = require('assert');
var os = require('os');
var fs = require('fs');
var url = require('url');
var http = require('http');
var httpd = require('./httpd.js'); // launch the http server
var wsd = require('./wsd.js'); // launch the web sockets server
var base_uri = 'http://localhost:8888/wot/'; // base URI for models on this server
var pending = {}; // mapping from uri to list of things with unresolved dependencies
var Thing = require('./thing.js');
var Registry = require('./registry.js');

// registry of locally hosted things with mapping from thing id to model, implementation and status
var registry = {};
var registry2 = new Registry(base_uri);

httpd.set_registry(registry); // pass reference to http server so it can serve up models
wsd.register_base_uri(base_uri);
console.log("this server thinks its hostname is " + os.hostname());

// create new thing given its unique name, model and implementation
function thing(name, model, implementation) {
    var thing = new Thing(base_uri, name, model, implementation, registry);
    
    register_thing(model, thing);
    
    // if no unresolved dependencies, start the new thing now if not already running

    if (thing._unresolved <= 0) {
        if (!thing._running) {
            console.log("starting1 " + name);
            thing._running = true;
            implementation.start(thing);
            //flush_queue(thing);
        } else
            console.log(name + ' is already running');
    } else
        console.log("deferring start of " + name + " until its dependencies are resolved");


    // some things may be waiting for this thing
    notify_dependents(thing);
}

function register_thing(model, thing) {
    console.log('registering ' + thing._uri);
    registry[thing._uri] = {
        model: model,
        thing: thing
    };
    
    wsd.register_thing(thing);
}

function unregister_proxy(uri) {
    // *** implement me *** needs to remove proxy from list of proxies for given uri
    console.log("*** unregister_proxy isn't implemented");
}

function notify_dependents(dependee) {
    var dependents = pending[dependee._uri];
    
    if (dependents) {
        console.log('resolving dependencies on ' + dependee._name);
        for (var i = 0; i < dependents.length; ++i) {
            var dependency = dependents[i];

            if (dependency.handler) {
                dependency.handler(dependee);
            } else if (dependency.dependent) {
                var thing = dependency.dependent;
                var property = dependency.property;
                resolve_dependency(thing, property, dependee, true);
            }
        }

        delete pending[dependee._name];
    }
}

function resolve_dependency(thing, property, dependee, start) {
    console.log('setting ' + thing._name + "'s " + property + " to " + dependee._name);
    thing[property] = dependee;
    thing._unresolved--;

    if (start && thing._unresolved <= 0 && thing._implementation && !thing._running) {
        console.log('starting2 ' + thing._name);
        thing._running = true;
        thing._implementation.start(thing);
        flush_queue(thing);
    }
}

function register_proxy() {
    
}


exports.thing = thing;
exports.register_proxy = register_proxy;