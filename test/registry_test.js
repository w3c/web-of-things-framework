var Registry = require('../registry.js');
var assert = require("assert");
var should = require('should');

describe('Registry', function() {
    it('should register items', function(done) {
        var registry = new Registry("http://localhost:8888/wot/");
        
        var started = false;

        thingUri = registry.register(
            "thing1", 
            {
                // empty model        
            },
            {
                start: function (thing) {
                    started = true;
                },
                stop: function(thing) {
                }
            });
        
        assert.equal('http://localhost:8888/wot/thing1', thingUri,
                    "The thing uri was not created as expected");

        registry.find(thingUri, 
            function (found) {
                assert(found, "The thing was not found");
                assert.equal('http://localhost:8888/wot/thing1', found._uri);
                assert(started, "The thing was not started");
                done();
            },
            function (err) {
                assert.fail(err);
                done();
            });
    });

    it('should register dependent items', function (done) {
        var registry = new Registry("http://localhost:8888/wot/");
        
        var thing1_started = false;
        var thing2_started = false;
        var thing3_started = false;
        
        thing1Uri = registry.register(
            "thing1", 
            {
                "@dependencies": {
                    "other": "thing2"
                }
            },
            {
                start: function (thing) {
                    thing1_started = true;
                },
                stop: function (thing) {
                }
            });

        assert(!thing1_started, "It should not be started yet");

        thing2Uri = registry.register(
            "thing2", 
            {
            },
            {
                start: function (thing) {
                    thing2_started = true;
                },
                stop: function (thing) {
                }
            });
        
        assert(thing1_started, "Thing1 should now be started");
        assert(thing2_started, "Thing2 should now be started");
        
        thing3Uri = registry.register(
            "thing3", 
            {
                "@dependencies": {
                    "other1": "thing1",
                    "other2": "thing2"
                }
            },
            {
                start: function (thing) {
                    thing3_started = true;
                },
                stop: function (thing) {
                }
            });

        assert(thing3_started, "Thing3 should now be started");
        done();
    });
});