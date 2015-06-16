var wot = require('../framework.js'); // launch the servers
var assert = require("assert");

describe('Thing with multiple properties should initialize correctly', function() {
    describe('setting values', function() {
        it('should have properly set values', function() {
            // define the thing with multiple properties
            wot.thing("twoprops", {
                "@properties": {
                    "property1": "string",
                    "property2": "string"
                }
            }, {
                start: function(thing) {
                    console.log("setting property 1");
                    thing.property1 = "property 1";

                    console.log("setting property 2");
                    thing.property2 = "property 2";
                },
                stop: function(thing) {},
            });

            

        })
    })
});