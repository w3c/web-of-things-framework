var Registry = require('../registry.js');
var Thing = require('../thing.js');
var assert = require("assert");
var should = require('should');

describe('Registry', function() {
    it('should register items', function (done) {
        var baseUri = "http://localhost:8888/wot/";
        var registry = new Registry(baseUri);
        
        var started = false;

        var thing1 = registry.register("thing1", 
            {
                // empty model        
            },
            {
            start: function (thing) {
                started = true;
            },
            stop: function (thing) {
            }
        });
        
        assert.equal('http://localhost:8888/wot/thing1', thing1._uri);

        registry.find(thing1._uri, 
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
        var baseUri = "http://localhost:8888/wot/";
        var registry = new Registry(baseUri);

        var thing1_started = false;
        var thing2_started = false;
        var thing3_started = false;

        registry.register("thing1",
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

        registry.register(
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
        
        registry.register(
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