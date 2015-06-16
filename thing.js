var url = require('url');


// create new thing given its unique name, model and implementation
function Thing(base_uri, name, model, implementation) {
    var options = url.parse(url.resolve(base_uri, name));
    
    console.log("creating: " + name + " at " + options.href);

    this._name = name;
    this._uri = options.href;
    this._model = model;
    this._observers = {};
    this._properties = {};
    this._values = {};
    this._running = false;
    this._queue = [];
    this._implementation = implementation;
}

module.exports = Thing;