
var url = require('url');
var os = require('os');
var LocalThing = require('./local.js');
var ProxyThing = require('./proxy.js');
var wsd = require('./wsd.js'); // launch the web sockets server

function Registry(baseUri) {
    var self = this;

    self._things = {};
    self._proxies = {};
    self._base_uri = baseUri;
    self._wsd = wsd;

    // { 
    //   waiting: <uri to the object that is waiting to be resolved>
    //   needed: <uri to the object that is needed>
    //   name: the name of the dependency
    // }
    self._waiting_for = [];

    // the items that need to be started now that everything is resolved    
    self._start_queue = [];

    self.get_either = function(uri) {
        var thing = self.get_thing(uri);

        if (thing) {
            return thing;
        }

        return self.get_proxy(uri);
    }

    self.get_thing = function(uri) {
        var id = url.parse(uri).path;

        if (self._things.hasOwnProperty(id)) {
            return self._things[id];
        }

        return undefined;
    }

    self.get_proxy = function(uri) {
        if (self._proxies.hasOwnProperty(uri)) {
            return self._proxies[uri];
        }

        return undefined;
    }

    self.has_dependencies = function(thing) {
        return thing._model.hasOwnProperty("@dependencies");
    }

    self.record_dependencies = function(thing) {
        thing._unresolved = 0;

        if (!self.has_dependencies(thing)) {
            self._start_queue.push(thing);
            return;
        }

        var dependencies = thing._model["@dependencies"];

        // first count the number of dependencies
        for (var name in dependencies) {
            if (dependencies.hasOwnProperty(name)) {
                var uri = dependencies[name];

                // *** fix me - handle error on malformed uri ***
                uri = url.parse(url.resolve(thing._uri, uri)).href;

                console.log(thing._uri + " is waiting on " + uri + " (" + name + ")");

                self._waiting_for.push({
                    name: name,
                    waiting: thing._uri,
                    needed: uri
                });
                thing._unresolved++;
            }
        }
    }

    self.run_start_queue = function() {
        for (var i = 0; i < self._start_queue.length; i++) {
            var thing = self._start_queue[i];
            if (!thing._running) {
                thing.start();
            }
        }

        self._start_queue = [];
    }

    // thing is the thing we just created
    // dependency is the object from self._waiting_for
    // indicating which thing is resolvable
    self.resolve_dependent = function(name, parentUri, childUri) {
        var parent = self.get_thing(parentUri).thing;
        var child = self.get_thing(childUri).thing;

        parent[name] = child;
        parent._unresolved--;

        if (parent._unresolved === 0) {
            self._start_queue.push(parent);
        }
    }

    self.resolve_dependents = function(thing) {
        var dependency;
        var i;

        // resolve things that depend on self object
        for (i = 0; i < self._waiting_for.length; i++) {
            dependency = self._waiting_for[i];
            if (dependency.needed === thing._uri) {
                self.resolve_dependent(dependency.name, dependency.waiting, thing._uri);
                self._waiting_for.splice(i, 1);
                i--;
            }
        }

        // resolve dependencies of the provided object
        for (i = 0; i < self._waiting_for.length; i++) {
            dependency = self._waiting_for[i];
            if (dependency.waiting === thing._uri) {
                var other = self.get_thing(dependency.needed);
                if (other) {
                    self.resolve_dependent(dependency.name, thing._uri, dependency.needed);
                    self._waiting_for.splice(i, 1);
                    i--;
                }
            }
        }

        self.run_start_queue();
    }

    self.isLocalUri = function(uri) {
        var parsed = url.parse(uri);
        var base_parsed = url.parse(self._base_uri);
        
        if (parsed.port !== base_parsed.port) {
            return false;
        }        

        if (parsed.hostname === 'localhost' ||
            parsed.host === 'localhost' ||
            parsed.hostname === '127.0.0.1' ||
            parsed.host === '127.0.0.1' ||
            parsed.hostname === '::1' ||
            parsed.host === '::1' ||
            parsed.hostname === os.hostname() ||
            parsed.host === os.hostname()) {
            return true;
        }

        return false;
    }
}

Registry.prototype.find = function(uri, succeed, missing) {
    var found = this.get_thing(uri);

    if (!found) {
        missing("Thing not found: " + uri);
    } else {
        succeed(found.thing);
    }
}


Registry.prototype.register = function(name, model, implementation) {
    var self = this;

    var options = url.parse(url.resolve(self._base_uri, name));
    var id = url.parse(options.href).path;

    var existing = self.get_thing(options.href);

    if (existing) {
        throw ('The thing already exists: ' + options.href);
    } else {
        var thing = new LocalThing(options.href, name, model, implementation);

        // if there is a proxy for this ID we're about to over-write it
        // so get rid of it before going on
        delete self._proxies[id];

        self._things[id] = {
            model: thing._model,
            thing: thing
        };

        self.record_dependencies(thing);
        self.resolve_dependents(thing);
        self._wsd.register_thing(thing);
    }
}

Registry.prototype.register_proxy = function(uri, onstart) {
    var self = this;
    var existing;

    if (self.isLocalUri(uri)) {
        existing = self.get_thing(uri);
        if (existing) {
            onstart(existing.thing);
        }
    } else {
        existing = self.get_proxy(uri);
        if (existing) {
            onstart(existing.thing);
        } else {
            var proxy = new ProxyThing(uri, onstart);

            proxy.initialize(function(thing) {
                    self._proxies[uri] = {
                        model: thing._model,
                        thing: thing
                    };

                    self.record_dependencies(thing);
                    self.resolve_dependents(thing);
                    self._wsd.register_thing(thing);
                },
                function(err) {
                    console.log(err);
                });
        }
    }
}


module.exports = Registry;