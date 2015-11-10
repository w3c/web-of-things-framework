# Web of Things Framework for NodeJS

This is an experimental implementation of the [Web of Things Framework](#1), including a combined HTTP and Web Sockets server, as well as a web page library for demoing access to "things" from within web page scripts. This work has been done in support of the [W3C Web of Things Interest Group](#3).

A hundred billion IoT devices are expected to be deployed over the next ten years. There are many IoT platforms, and an increasing number of IoT technologies. However, the IoT products are currently beset by silos and a lack of interoperability, which blocks the benefits of the network effect from taking hold.  At W3C, we are exploring the potential for bridging IoT platforms and devices through the World Wide Web via a new class of Web servers that are connected through a common framework, and available in a variety of scales from microcontrollers, to smart phones and home/office hubs, and cloud-based server farms.

This framework involves virtual objects ("things") as proxies for physical and abstract entities. These things are modelled in terms of metadata, events, properties and actions, with bindings to scripting APIs and a variety of protocols, since no one protocol will fulfil all needs. 

This project explores the use of JSON-LD as the basis for describing things. The thing description language (TDL) declares the metadata, events, properties and actions, as well as the relationship that this "thing" has to other things. Complementary informal descriptions allow for thingsonomies. A web server implementing the web of things framework provides an interface for instantiating local objects as a proxy for the thing they represent, starting from the URI for that thing's description. Servers also provide an interface to registering new "things" along with their description and implementation. Such things could interface to IoT sensors and actuators, or play the role of agents that implement a service in terms of other "things".

The scripting languages available will depend upon the server. This particular project supports JavaScript courtesy of NodeJS.  To start with, only bindings to Web Sockets are provided. Over time, the aim is to expand this to other protocols, e.g. HTTP, CoAP, MQTT, XMPP and AMQP.  In addition, the aim is to illustrate how to support a variety of IoT devices over Bluetooth, ZigBee and so forth. The challenges will include the security and communications metadata. Security metadata covers such things access control and the terms and conditions under which a data owner permits others to access this data. Communications metadata covers such as aspects as scheduling time slots for communicating with low power devices that spend most of the time sleeping, and for bulk data transfers, where the focus is on a continuous log of sensor data. The framework allows applications to indicate when a property has been updated but not yet applied as can happen when waiting for an IoT device to wake up and open its receive window.

## Technical Recap.

The Web of Things starts with URIs for “thing” descriptions as Linked Data expressed in JSON-LD. Things are modelled in terms of their events, properties and actions. Scripts use this URI to ask the server to create a local proxy object in the script’s execution space for the designated thing. The server takes care of the protocol details, and can use which protocol best suits its needs, e.g. HTTP, WebSockets, CoAP, MQTT, XMPP or AMQP.  The thing metadata and the target server metadata enable the server hosting the proxy to figure out which protocol to use for the messaging between the proxy and the thing it proxies.

You can have chains of proxies across different servers, which can range from microcontrollers to cloud-based server farms. Whilst REST based messages are used, the URI paths are really a matter for each server (just as in HTTP).  Discovery involves a range of techniques: mDNS and UPnP on local networks, Bluetooth and BLE beacons, NFC, barcodes, cloud based device registries, social networks of people and things, and by following links between things from the dependencies stated in their descriptions. Servers may also expose a list of the things they host. Privacy will be based upon access control, and terms & conditions that enable data owners to control who can access their data and for what purpose.

## Prerequisites

 1. Git
 2. node.js and npm
 3. websockets node module (ws)
 
## Installation

The starting point is to install Git, see:

  http://git-scm.com/book/en/v2/Getting-Started-Installing-Git

Then install node.js and npm from https://nodejs.org/download/

Next create a copy of this directory and change to it

```
  git clone https://github.com/w3c/web-of-things-framework
  cd web-of-things-framework
```

Install the node web socket module (and other dependencies):

```
  npm install
```

To start the server use the following command from a terminal shell:

```
  cd examples\coap_demo
  node demo.js
```
to run the CoAP demo

```
  cd examples\http_demo
  node demo.js
```
to run the HTTP REST demo

Both for the CoAP and HTTP demo point your web browser to load the demo web page at

  http://localhost:8888/
  
and open the browser console to view the log.

Click on the Things menu item in the browser to view the loaded things.

Open other browser instance at http://localhost:8888/ and invoke actions and writable properties, the framework should send data to both browser sessions.

```
  cd examples\p2p_demo
  node demo.js
```
to run the P2P Kademlia (DHT) and peer to peer demo. 

 

1. <a name="1">http://www.w3.org/blog/2015/05/building-the-web-of-things</a>
2. <a name="1">http://www.w3.org/2015/05/wot-framework.pdf</a>
3. <a name="2">http://www.w3.org/WoT/IG/</a>

## Contributing

[![Gitter](https://badges.gitter.im/Join%20Chat.svg)](https://gitter.im/w3c/web-of-things-framework?utm_source=badge&utm_medium=badge&utm_campaign=pr-badge)

We welcome contributions. If you find a bug in the source code or a mistake in the documentation, you can help us by submitting an issue to our [GitHub repository](https://github.com/w3c/web-of-things-framework), and likewise if you have suggestions for new features. Even better you can submit a Pull Request with a fix. We also have a Gitter chat channel, see above link.

Note: we are using [js-beautify](https://github.com/beautify-web/js-beautify) with its default settings for normalising the use of whitespace in JavaScript source code.

We encourage you to join the W3C [Web of Things Community Group](https://www.w3.org/community/wot/) where contribution and discussions happen. Anyone can join and there are no fees.

The amount of time you contribute and the areas in which you contribute is up to you. 

We need plenty of help with developing open source software for the Web of Things, including servers and test frameworks and test suites.  I have started a NodeJS based server, and we also are looking for help with servers on microcontrollers, on smart phones/tablets, and for highly scalable cloud based systems.

There are opportunities to help with embedded systems, especially when it comes to embedded web of things servers, and device drivers. We will need a way to describe the communications patterns used by particular device, e.g. how to communicate with devices that spend most of their time asleep, and the way in which data is buffered or multiplexed (e.g. when aggregating data from multiple sensors).

There are also plenty of areas where you could contribute that don’t involve programming, for example, gathering use cases and requirements, the details of the bindings to protocols, and the architectural considerations. Security and privacy are areas where we need to better understand what’s practical. Real-time control e.g. of manufacturing robots is one of the potential application domains where the architectural considerations are especially challenging. When it comes to programming, you would have an opportunity to take on the role of an IoT application developer who writes the application scripts. We will be looking of people who can try things out and share the experiences with others as a way of building interest in the wider community.

Please see the other project documentation (*.md), e.g. [protocol bindings](https://github.com/w3c/web-of-things-framework/blob/master/bindings.md) and also the list of project issues where we are looking for help, including design topics and bugs.

### Acknowledgements

This work has been funded in part (through October 2015) by the European Union's 7th Research Framework Programme (FP7/ 2013-2015) under grant agreement nº317862 - Compose.

### Related Projects

These are not as far advanced as the NodeJS project, and your help is welcomed.

* [Web of Things server for the Arduino microcontroller](https://github.com/w3c/wot-arduino)
* [Web of Things server for the ESP8266 microcontroller](https://github.com/w3c/wot-esp8266)
* [Web of Things server for the Go programming language](https://github.com/w3c/wot-go)

## License

(The MIT License)

Copyright (c) 2015 Dave Raggett &lt;dsr@w3.org&gt;

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the 'Software'), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED 'AS IS', WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
