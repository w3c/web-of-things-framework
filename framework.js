// wot-framework.js
var exports = module.exports = {};

var assert = require('assert');
var os = require('os');
var fs = require('fs');
var url = require('url');

var base_uri = 'http://localhost:8888/wot/'; // base URI for models on this server

var Registry = require('./registry.js');
var registry = new Registry(base_uri);


var wsd = require('./wsd.js'); // launch the web sockets server
wsd.register_base_uri(base_uri, registry);

var httpd = require('./httpd.js'); // launch the http server
httpd.set_registry(registry); // pass reference to http server so it can serve up models

console.log("this server thinks its hostname is " + os.hostname());

// create new thing given its unique name, model and implementation
function thing(name, model, implementation) {
    registry.register(name, model, implementation);
}

function unregister_proxy(uri) {
    // *** implement me *** needs to remove proxy from list of proxies for given uri
    console.log("*** unregister_proxy isn't implemented");
}


function register_proxy(uri, succeed, error) {
    var proxy = registry.register_proxy(uri, succeed, error);
}


exports.thing = thing;
exports.register_proxy = register_proxy;