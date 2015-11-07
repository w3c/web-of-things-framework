var events = require("events");

var eventEmitter = new events.EventEmitter();

exports.onProperty = function (thing, patch, data) {
    var payload = {
        thing: thing,
        patch: patch,
        data: data
    };
    eventEmitter.emit("thingevent", "propertychange", payload);
}

exports.onEventSignalled = function (thing, event, data) {
    var payload = {
        thing: thing,
        event: event,
        data: data
    };
    eventEmitter.emit("thingevent", "eventsignall", payload);
}

exports.onDeviceMessage = function (data) {
    eventEmitter.emit("device_msg", data);
}

exports.onDevicePropertyChanged = function (data) {
    eventEmitter.emit("device_property_changed", data);
}

exports.onDeviceEventSignalled = function (data) {
    eventEmitter.emit("device_event_signalled", data);
}


exports.emitter = eventEmitter;