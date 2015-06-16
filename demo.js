var wot = require('./framework.js'); // launch the servers

// define the things for the door, light and agent

wot.thing("agent12", {
    "@dependencies": {
        "door": "door12",
        "light": "switch12"
    }
}, {
    start: function(thing) {
        console.log("  started " + thing._name);
        console.log("  door is " + (thing.door.is_open ? "open" : "closed"));
        console.log("  light is " + (thing.light.on ? "on" : "off"));
    },
    stop: function(thing) {},
});

wot.thing("door12", {
    "@events": {
        "bell": null,
        "key": {
            "valid": "boolean"
        }
    },
    "@properties": {
        "is_open": "boolean"
    },
    "@actions": {
        "unlock": null
    }
}, {
    start: function(thing) {
        thing.is_open = false;
    },
    stop: function(thing) {},
    unlock: function(thing) {
        console.log("  unlocking" + thing._name);
    }
});

wot.thing("switch12", {
    "@properties": {
        "on": {
            "type": "boolean",
            "writeable": true
        }
    }
}, {
    start: function(thing) {
        thing.on = true;
    },
    stop: function(thing) {},
});

// test for resolving circular dependencies

wot.thing("foo1", {
    "@dependencies": {
        "bar": "bar1"
    }
}, {
    start: function(thing) {
        console.log("  foo1's bar is " + thing.bar._name);
    },
    stop: function(thing) {},
});

wot.thing("bar1", {
    "@dependencies": {
        "foo": "foo1"
    }
}, {
    start: function(thing) {
        console.log("  bar1's foo is " + thing.foo._name);
    },
    stop: function(thing) {},
});

wot.register_proxy("/wot/door12", function(thing) {
        console.log('got proxy for door12');
    },
    function(err) {
        console.log(err);
    });


wot.register_proxy("http://localhost:8888/wot/switch12", function(thing) {
        console.log('got proxy for switch12');
    },
    function(err) {
        console.log(err);
    });

wot.register_proxy("http://akira.w3.org:8888/wot/switch12", function(thing) {
        console.log('got proxy for switch12');
    },
    function(err) {
        console.log(err);
    });
