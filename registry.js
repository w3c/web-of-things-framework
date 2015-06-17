var url = require('url');
var Thing = require('./thing.js');

function Registry(baseUri) {
    this._things = {};
    this._base_uri = baseUri;
    
    // { 
    //   waiting: <uri to the object that is waiting to be resolved>
    //   needed: <uri to the object that is needed>
    //   name: the name of the dependency
    // }
    this._waiting_for = [];
    
    // the items that need to be started now that everything is resolved    
    this._start_queue = [];

    this.get = function(uri) {
        if (this._things.hasOwnProperty(uri)) {
            return this._things[uri];
        }
        
        return undefined;        
    }
    
    this.has_dependencies = function(thing) {
        return thing._model.hasOwnProperty("@dependencies");
    }

    this.record_dependencies = function(thing) {
        thing._unresolved = 0;

        if (!this.has_dependencies(thing)) {
            this._start_queue.push(thing);
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

                this._waiting_for.push({
                    name: name,
                    waiting: thing._uri,
                    needed: uri
                });
                thing._unresolved++;
            }
        }
    }
    
    this.run_start_queue = function () {
        var self = this;
        for (var i = 0; i < self._start_queue.length; i++) {
            var thing = self._start_queue[i];
            if (!thing._running) {
                console.log("starting " + thing._uri);
                thing._running = true;

                if (thing._implementation && thing._implementation.start) {
                    thing._implementation.start(thing);
                }
            }
        }
        
        this._start_queue = [];
    }
    
    // thing is the thing we just created
    // dependency is the object from this._waiting_for
    // indicating which thing is resolvable
    this.resolve_dependent = function (name, parent_uri, child_uri) {
        var parent = this.get(parent_uri).thing;
        var child = this.get(child_uri).thing;
        
        parent[name] = child;
        parent._unresolved--;

        if (parent._unresolved === 0) {
            this._start_queue.push(parent);
        }
    }
    
    this.resolve_dependents = function (thing) {
        var self = this;
        
        // resolve things that depend on this object
        for (var i = 0; i < self._waiting_for.length; i++) {
            var dependency = self._waiting_for[i];
            if (dependency.needed === thing._uri) {
                self.resolve_dependent(dependency.name, dependency.waiting, thing._uri);
                this._waiting_for.splice(i, 1);
                i--;
            }
        }
        
        // resolve dependencies of the provided object
        for (var i = 0; i < self._waiting_for.length; i++) {
            var dependency = self._waiting_for[i];
            if (dependency.waiting === thing._uri) {
                var other = self.get(dependency.needed);
                if (other) {
                    self.resolve_dependent(dependency.name, thing._uri, dependency.needed);
                    this._waiting_for.splice(i, 1);
                    i--;
                }
            }
        }
        
        this.run_start_queue();
    }
}

Registry.prototype.find = function (uri, succeed, missing) {
    var found = this.get(uri);
    if (!found) {
        missing("Thing not found: " + uri);
    }

    succeed(found.thing);
}

Registry.prototype.find_model = function (uri, succeed, missing) {
    var found = this.get(uri);
    if (!found) {
        missing("Thing not found: " + uri);
    }

    succeed(found.model);
}

Registry.prototype.register = function(name, model, implementation) {
    var self = this;
    var thing = new Thing(this._base_uri, name, model, implementation, this._things);

    self._things[thing._uri] = {
        model: thing._model,
        thing: thing
    };


    self.record_dependencies(thing);
    self.resolve_dependents(thing);

    return thing._uri;
}


module.exports = Registry;