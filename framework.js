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
var registry2 = new Registry(base_uri);

httpd.set_registry(registry2); // pass reference to http server so it can serve up models
wsd.register_base_uri(base_uri);
console.log("this server thinks its hostname is " + os.hostname());

// create new thing given its unique name, model and implementation
function thing(name, model, implementation) {
    var thing = registry2.register(name, model, implementation);
}

function unregister_proxy(uri) {
    // *** implement me *** needs to remove proxy from list of proxies for given uri
    console.log("*** unregister_proxy isn't implemented");
}


function register_proxy() {
    
}


exports.thing = thing;
exports.register_proxy = register_proxy;