# Abstract Messages and Bindings to Concrete Protocols

This follows on from the [description of abstract model of the Web of Things](./things.md). This issue discusses the binding of abstract messages to protocols and communication patterns. The protocol bindings can be described in terms of a mapping to a set of abstract messages:

* property update with the thing, the property path and the new value
* action invocation with the thing, the call id, the action name and the value to be passed
* action response with the thing, the call id, the action name and the value to be passed
* event notification with the thing, the event name and the value to be passed
* (un)register for an event name
* (un)register local proxy for remote thing
* (un)register remote proxy for local thing
* death of a thing or ancestor proxy

## Asynchronous Messaging Protocols

This is a class of protocols that allow either party to send asynchronous messages to the other party. One example uses JSON over WebSockets. This is valuable for human machine interfaces using Web browsers, which restrict web page scripts to a very small set of protocols (HTTP, WebSockets and WebRTC). The mapping from an abstract message to a JSON message over WebSockets is straightforward, e.g. one to one, using strings for thing identifiers.

## REST based Protocols

For these protocols, e.g. HTTP and CoAP, abstract messages are mapped into GET, PUT, POST, PATCH and DELETE requests to specific URLs.  The servers for these protocols expose a hierarchy of resources as URL paths. In keeping with Roy Fielding's principles for representational state transfer, GET is used to retrieve the full state of the given resource, PUT to update the full state of the given resource. POST can be used to create a new resource, DELETE to delete a resource, and PATCH to update part of the state of a resource.

This leaves the freedom to decide whether a single resource corresponds to a given thing, or to a property of that thing. In the former case GET and PUT transfer the complete set of properties for a thing. In the latter case the mapping from a property path to the URL path for the corresponding resource may involve a simple transformation that is the same for all of the properties. Alternatively, the mapping has to be defined explicitly for each property.

Events and action responses are asynchronous. One way to handle this is to pass a URI for the HTTP server to post the event or response to. Another is for an HTTP server to keep the connection open and send the responses as a stream. The challenge here is what to do when a connection is closed somewhere along the line, e.g. by a firewall or HTTP proxy server.  This makes it worthwhile to utilise a call id so that a client can poll the HTTP server in the connection closes prematurely. CoAP can be considered as equivalent to HTTP but running over UDP rather than TCP.  CoAP allows clients to request a stream of responses via setting the Observe header.

There are a number of existing approaches to formally describing REST based services. One of these uses RAML and JSON Schema. I think of a lot of the complexity can be avoided through the separation of declaring the application data and interaction model, and the bindings to specific protocols.  This is something to show practically through demos.

## Pub/Sub Protocols

This includes protocols such as MQTT, XMPP and AMQP.  MQTT routes messages via brokers to clients who have expressed interest in particular message topics. This works well when there are many clients interested in receiving sensor data.  It doesn't work so well for actions where the responses need to be routed to the specific client that invoked the action.  This suggests the need for a triple of topic names. One topic for routing messages to the IoT device, the second for routing messages to a specific client, and the third for routing events and property updates to all clients with proxies for the thing created by the IoT device.

## Streams

A common case is where readings from one or more sensors need to be buffered and transferred as a block. This block needs to be associated with metadata sufficient to separate out each of the constituent readings. Another case is where a time sequence of values is sent to control an actuator, e.g. the joints in a manufacturing robot's arm. IoT devices may not have real-time clocks with which to provide date stamps for sensor readings. In such cases, a gateway may be able to add these if needed. Gateways may further combine streams from different sources as appropriate.

