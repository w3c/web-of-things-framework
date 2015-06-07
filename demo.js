var wot = require('./framework.js');  // launch the servers

// define the things for the door, light and agent
  
wot.thing("agent12",
  {
    "@dependencies" : {
      "door" : "door12",
      "light" : "switch12"
    }
  }, {
    start: function (thing) {
      console.log("started agent12");
      console.log("door is " + (thing.door.is_open ? "open" : "closed"));
      console.log("light is " + (thing.light.on ? "on" : "off"));
    },
    stop: function (thing) {
    },
  });

wot.thing("door12",
  {
    "@events" : {
      "bell": null,
      "key": {
        "valid" : "boolean"
      }
    },
    "@properties" : {
      "is_open" : "boolean"
    },
    "@actions" : {
      "unlock" : null
    }
  }, {
    start: function (thing) {
      thing.is_open = false;
      console.log("started door12");
    },
    stop: function (thing) {
    },
    unlock: function () {
      console.log("unlocking door12");
    }
  });
  
wot.thing("switch12",
  {
    "@properties" : {
      "on" : {
        "type" : "boolean",
        "writeable" : true
      }
    }
  }, {
    start: function (thing) {
      thing.on = true;
      console.log("started switch12");
    },
    stop: function (thing) {
    },
  });

// test for resolving circular dependencies

wot.thing("foo1",
  {
    "@dependencies" : {
      "bar" : "bar1"
    }
  }, {
    start: function (thing) {
      console.log("started foo1");
      console.log("foo1's bar is " + thing.bar._name);
    },
    stop: function (thing) {
    },
  });

wot.thing("bar1",
  {
    "@dependencies" : {
      "foo" : "foo1"
    }
  }, {
    start: function (thing) {
      console.log("started bar1");
      console.log("bar1's foo is " + thing.foo._name);
    },
    stop: function (thing) {
    },
  });

wot.proxy("http://localhost:8888/wot/switch12", function (thing) {
    console.log('got proxy for switch12');
  },
  function (err) {
    console.log(err);
  });
  