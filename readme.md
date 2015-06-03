# Web of Things Framework for NodeJS

This is an experimental implementation of the [Web of Things Framework](#1), including a combined HTTP and Web Sockets server, as well as a web page library for demoing access to "things" from within web page scripts. This work has been done in support of the [W3C Web of Things Interest Group](#3).

A hundred billion IoT devices are expected to be deployed over the next ten years. There are many IoT platforms, and an increasing number of IoT technologies. However, the IoT products are currently beset by silos and a lack of interoperability, which blocks the benefits of the network effect from taking hold.  At W3C, we are exploring the potential for bridging IoT platforms and devices through the World Wide Web via a new class of Web servers that are connected through a common framework, and available in a variety of scales from microcontrollers, to smart phones and home/office hubs, and cloud-based server farms.

This framework involves virtual objects ("things") as proxies for physical and abstract entities. These things are modelled in terms of metadata, events, properties and actions, with bindings to scripting APIs and a variety of protocols, since no one protocol will fulfil all needs. 

This project explores the use of JSON-LD as the basis for describing things. The thing description language (TDL) declares the metadata, events, properties and actions, as well as the relationship that this "thing" has to other things. A web server implementing the web of things framework provides an interface for instantiating local objects as a proxy for the thing they represent, starting from the URI for that thing's description. Servers also provide an interface to registering new "things" along with their description and implementation. Such things could interface to IoT sensors and actuators, or play the role of agents that implement a service in terms of other "things".

The scripting languages available will depend upon the server. This particular project supports JavaScript courtesy of NodeJS.  To start with, only bindings to Web Sockets are provided. Over time, the aim is to expand this to other protocols, e.g. HTTP, CoAP, MQTT and XMPP.  In addition, the aim is to illustrate how to support a variety of IoT devices over Bluetooth, ZigBee and so forth. The challenges will include the security and communications metadata. Security metadata covers such things access control and the terms and conditions under which a data owner permits others to access this data. Communications metadata covers such as aspects as scheduling time slots for communicating with low power devices that spend most of the time sleeping, and for bulk data transfers, where the focus is on a continuous log of sensor data.

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
  node demo.js
```

To load the demo web page point your web browser to

  http://localhost:8888/
  
and open the browser console to view the log

1. <a name="1">http://www.w3.org/blog/2015/05/building-the-web-of-things</a>
2. <a name="1">http://www.w3.org/2015/05/wot-framework.pdf</a>
3. <a name="2">http://www.w3.org/WoT/IG/</a>

## Contributing

We welcome contributions. If you find a bug in the source code or a mistake in the documentation, you can help us by submitting an issue to our [GitHub repository](https://github.com/w3c/web-of-things-framework), and likewise if you have suggestions for new features. Even better you can submit a Pull Request with a fix.

We encourage you to join the W3C [Web of Things Community Group](http://www.w3.org/WoT/IG/) where contribution and discussions happen. Anyone can join and there are no fees.

## License

(The MIT License)

Copyright (c) 2015 Dave Raggett &lt;dsr@w3.org&gt;

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the 'Software'), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED 'AS IS', WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
