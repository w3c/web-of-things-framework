var fs = require('fs');
var path = require('path');
var util = require('util');
var url = require('url');
var logger = require('../../logger');
var config = require('../../config');
var Thing = require('./thing').Thing;
var list_of_things = require('../lists/registry.js');

function get_thing (name) {
    if (list_of_things.hasOwnProperty(name)) {
        return list_of_things[name];
    }
    
    return undefined;
}

function get_thing_async(name, callback) {
    var thing = get_thing(name);
    if (thing == undefined) {
        return callback('The thing is not registered');
    }
    
    callback(null, thing);
}



function register_thing (name, thing) {
    if (!name || !thing) {
        throw ('Error in register_thing(). The id and thing canot be null');
    }
    
    var isexists = get_thing(name);
    if (isexists) {
        throw ('Error in register_thing(). The thing already exists. id: ' + id);
    }
    
    list_of_things[name] = thing;
}


function get_thing_model (name, callback) {
    var thing = get_thing(name);
    if (thing == undefined) {
        return callback('The thing is not registered');
    }

    var model = thing.model;
    if (!model) {
        return callback('The thing model is null');
    }

    callback(null, model);
}


function register_from_database() {
    //  TODO implement this to populate the things from database 
    throw new Error("Populating things from database is not implemented");
}


function register_from_webservice() {
    //  TODO implement this to populate the things from web service 
    throw new Error("Populating things from web service is not implemented");
}


function register_from_configfile(config_path) {
    try {
        var data = require('../../data/things_list');
        if (!data || !util.isArray(data)) {
            return logger.error("Error in parsing things configuration file. Invalid data.");
        }
        
        for (var i = 0; i < data.length; i++) {
            var thing_def = data[i];
            thing_def.thing(function (err, thing){
                var name, protocol, model, implementation;
                name = thing.name;
                if (!name) {
                    return logger.error("Error in register_from_config. The thing name is required");
                }
                
                protocol = thing.protocol;
                if (!protocol) {
                    return logger.error("Error in register_from_config. The thing protocol is required");
                }
                
                model = thing.model;
                if (!model) {
                    return logger.error("Error in register_from_config. The thing model is required");
                }
                
                // The implementation where the start and stop methods callbacks reside is defined on the local file
                implementation = thing_def.implementation;
                if (!implementation) {
                    return logger.error("Error in register_from_config. The thing implementation is required");
                }
                
                var isexists = get_thing(name);
                if (isexists) {
                    return logger.error ('The thing already exists: ' + name);
                }
                
                var thingobj = new Thing(name, protocol, model, implementation);
                register_thing(name, thingobj);
            });            
        }
    }
    catch (e) {
        logger.error("Error in initializing things from local js file. " + e.message );
    }
}


module.exports = {
    localreg: register_from_configfile,
    webservicereg: register_from_webservice,
    databasereg: register_from_database,
    get_model: get_thing_model,
    get_thing: get_thing,
    get_thing_async: get_thing_async
}