var events = require("events");

var eventEmitter = new events.EventEmitter();

exports.onPropertyChanged = function (thing, patch, data) {
    var event_payload = {
        thing: thing,
        patch: patch,
        data: data
    };
    eventEmitter.emit("property_changed", event_payload);
}


exports.emitter = eventEmitter;