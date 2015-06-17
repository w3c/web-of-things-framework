var wot = require('../framework.js');
var Registry = require('../registry.js');
var assert = require("assert");
var should = require('should');

describe('Proxies', function () {
    it('should register return a local instance when possible', function (done) {

        var toggled = false;        

        wot.thing("switch12", {
            "@properties": {
                "on": {
                    "type": "boolean",
                    "writeable": true
                }
            },
            "@actions": {
                "toggle": null
            }
        }, {
            start: function (thing) {
                thing.on = true;
            },
            toggle: function(thing) {
                thing.on = !thing.on;
                toggled = true;
            }
        });

        wot.register_proxy("http://localhost:8888/wot/switch12", function (thing) {
                assert(thing._ws === undefined, "We should NOT have gotten back a proxy object.");
                assert(thing.on === true, "Initial state should be true");
                thing.toggle();            
                assert(thing.on === false, "Toggling should have turned the switch off");
                done();
            },
            function (err) {
                assert.fail(err);
                done();
            });


    });    
});