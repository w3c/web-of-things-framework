var wot = require('./framework.js'); // launch the servers

// define the things for the door, light and agent

//wot.thing("agent12", {
//    "@dependencies": {
//        "door": "door12",
//        "light": "switch12"
//    }
//}, {
//    start: function(thing) {
//        console.log("  started " + thing._name);
//        console.log("  door is " + (thing.door.is_open ? "open" : "closed"));
//        console.log("  light is " + (thing.light.on ? "on" : "off"));
//    },
//    stop: function(thing) {},
//});

//wot.thing("door12", {
//    "@events": {
//        "bell": null,
//        "key": {
//            "valid": "boolean"
//        }
//    },
//    "@properties": {
//        "is_open": "boolean"
//    },
//    "@actions": {
//        "unlock": null
//    }
//}, {
//    start: function(thing) {
//        thing.is_open = false;
//    },
//    stop: function(thing) {},
//    unlock: function(thing) {
//        console.log("  unlocking" + thing._name);
//    }
//});

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
        console.log("starting switch12");
        thing.on = true;
    },
    stop: function (thing) { },
    toggle: function(thing) {
        console.log("toggling switch12");
        thing.on = !thing.on;
    }
});

//// test for resolving circular dependencies

//wot.thing("foo1", {
//    "@dependencies": {
//        "bar": "bar1"
//    }
//}, {
//    start: function(thing) {
//        console.log("  foo1's bar is " + thing.bar._name);
//    },
//    stop: function(thing) {},
//});

//wot.thing("bar1", {
//    "@dependencies": {
//        "foo": "foo1"
//    }
//}, {
//    start: function(thing) {
//        console.log("  bar1's foo is " + thing.foo._name);
//    },
//    stop: function(thing) {},
//});

//wot.register_proxy("/wot/door12", function(thing) {
//        console.log('got proxy for door12');
//    },
//    function(err) {
//        console.log(err);
//    });

wot.register_proxy("http://bubbafat:8888/wot/switch12", function(thing) {
    console.log('got proxy for bubbafat:8888 switch12');
        thing.toggle();
        thing.toggle();
        thing.toggle();
        thing.toggle();
    },
    function(err) {
        console.log(err);
    });

//wot.register_proxy("http://localhost:9999/wot/switch12", function(thing) {
//        console.log('got proxy for localhost:9999 switch12');
//    },
//    function(err) {
//        console.log(err);
//    });

//wot.register_proxy("http://akira.w3.org:8888/wot/switch12", function(thing) {
//        console.log('got proxy for akira:8888 switch12');
//    },
//    function(err) {
//        console.log(err);
//});

