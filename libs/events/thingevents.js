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

exports.onEventSignalled = function (thing, event, data) {
    var event_payload = {
        thing: thing,
        event: event,
        data: data
    };
    eventEmitter.emit("event_signalled", event_payload);
}


exports.emitter = eventEmitter;