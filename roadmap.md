# Roadmap

The IoT suffers from fragmentation and product silos, the [W3C](http://www.w3.org) is one of the few organizations that can define global standards to enable discovery and interoperability of services on a world wide basis. We want to extend the Web from a Web of pages to a Web of Things in collaboration with other organizations and the broader community.

The Web of Things Framework is still at a very early stage, so this is just the time where we need people who understand the vision and want to play an active role in refining it. In particular, through work on open source projects and practical experience as a basis for guiding work on the emerging standards.

The value proposition is enabling lowered development costs and unlocking data silos by bridging IoT platforms through the Web at a range of device scales from microcontrollers to cloud-based server farms.  We will do this via a core model of services in terms of metadata, events, properties and actions, that is bound to a variety of protocols as no one protocol will fulfil all needs.  By bindings, we mean how to use the protocols to notify events and property updates, and how to invoke actions and return the results via [REST](http://en.wikipedia.org/wiki/Representational_state_transfer) based messages for each protocol.

The Web of Things Framework defines "things" as virtual objects acting as proxies for physical and abstract entities. Each "thing" has a description that covers its metadata, events, properties and actions. Things are hosted on servers. The scripting languages are server dependent. Servers can support a variety of protocols according to their needs. Things can be placed where needed, e.g. in an IoT device, a home hub, a smart phone, a PC, or in the cloud. The framework deals with the messaging,web  leaving script writers free to focus on how they want to use "things" in their applications.

This project is developing a Web of Things server implemented using [NodeJS](https://nodejs.org). It could be run on a PC or MacBook, on an Android phone/tablet using [anode](https://github.com/paddybyers/anode), on a Raspberry Pi functioning as a home hub, or on high performance hardware in the cloud. For constrained devices like the Arduino or the more powerful ESP8266, these devices could run simpler versions of the Web of Things servers, e.g. based on CoAP or MQTT, and optionally supporting scripting languages like Python or Lua, see [MicroPython](http://micropython.org) and [NodeMCU](http://nodemcu.com/index_en.html) respectively.

We're seeking your help to improve this project and related projects on other Web of Things servers. Please provide suggestions, bug reports, code enhancements and let us know how you are using the Web of Things in your own projects.

## Web of Things Community Group

You are encouraged to join the [W3C Web of Things Community Group](https://www.w3.org/community/wot/) to contribute to open discussions on practical experience and suggestions for standards relating to the Web of Things.

## Refining the framework

The initial implementation of the Web of Things Framework was very simple and relied on HTTP for accessing thing descriptions, and WebSockets for messaging. We're looking for help with refining this to cover a broader range of use cases and richer metadata, as well as examples of IoT device drivers, and work on extending the server to support bindings to other protocols, see later on.

### Richer metadata

The relevant metadata for the Web of Things needs to cover a wide range:

● **Thing descriptions**

 * Data models & relationships between things
 * Dependencies and version management
 * Discovery and provisioning
 * Bindings to APIs and protocols

● **Security related metadata**

 * Security practices
 * Mutual authentication
 * Access control
 * Terms & conditions, and relationship to liability
 * Payments
 * Trust and Identity Verification
 * Privacy and Provenance
 * Resilience

● **Communication related metadata**

 * Protocols and ports
 * Data formats & encodings
 * Multiplexing and buffering of data
 * Efficient use of protocols
 * Devices which sleep most of the time

It will take time to address all of this, and we're expecting progress to be driven by the needs of particular use cases. The starting point is to focus on the needs for simple applications in the home, making use of the inexpensive range of microcontrollers, sensors and actuators now readily available to hobbyists.

If you have expertise in the above topics, please get involved! For example, if you're knowledgeable about embedded systems, and want to work on extending the NodeJS server to support a richer range of communication patterns. Security is a critical area, so practical help on the above topics would be very much appreciated.


## Example drivers for IoT devices

There are a large range of inexpensive sensors and actuators available to the maker community.  In some cases, these could be directly attached to the device hosting the NodeJS Web of Things server, for instance, where the server is hosted on a Raspberry Pi. In other cases, it will be necessary to make use of IoT protocols such as Bluetooth, ZigBee or CoAP.

There are many NodeJS modules which could be exploited for this, and we are looking for examples that we can include as part of the NodeJS Web of Things server project.  We also looking for citations if you choose to use the NodeJS Web of Things server in your projects.

## Defining bindings for wider range of protocols

We are already working on bindings to HTTP and WebSockets, but would like help in extending the bindings to protocols such as CoAP, MQTT and XMPP. 

### Constrained Application Protocol (CoAP)

[CoAP](http://coap.technology) is a UDP based REST protocol for constrained devices connected via IP. It is defined by the IETF specification [RFC 7252](http://tools.ietf.org/html/rfc7252). [MicroCoAP](https://github.com/1248/microcoap) is a minimal implementation by [Tobey Jaffey](http://forum.arduino.cc/index.php?topic=187618.0) which runs on the [Arduino](http://www.arduino.cc/en/Products.Compare).

CoAP bindings for the Web of Things Framework would involve binary encodings of JSON, e.g. [CBOR](http://cbor.io) so as to fit messages into the short packet limits for devices like the Arduino. Likewise, [EXI](http://www.w3.org/XML/EXI/) could be used for efficient transfer of XML based messages.

In the Web of Things Framework, "things" are described in JSON-LD using the Thing Description Language (TDL). For devices with short packet limits, it may be appropriate to cite these descriptions by reference.

CoAP supports a pub-sub model that could be exploited for streaming sensor readings, or asynchronously delivering events, and property updates.

CoAP would also provide a proving ground for security on constrained devices.

### MQTT

[MQTT](http://docs.oasis-open.org/mqtt/mqtt/v3.1.1/mqtt-v3.1.1.html) is a light weight pub-sub messaging protocol, that is based on TCP/IP and involves message brokers for delivering messages to clients based upon their declared interest in particular message topics.

MQTT topics can be used to broadcast messages to a potentially large set of clients, or to deliver messages to a specific client, by defining a client specific topic. The broadcast model is appropriate for notifying events and property updates, whilst the client specific model is appropriate for invoking actions and delivering their results. Both kinds of topics could be exploited for discovery.

As for CoAP, binary encodings of JSON and XML could be used to compress message sizes.

### Extensible Messaging and Presence Protol (XMPP)

[XMPP](http://xmpp.org) is a widely used pub-sub protocol based upon XML and TCP/IP. It is defined by a suite of IETF RFCs. If you're an XMPP expert and would like to help us add support for XMPP, please get involved.

### Advanced Message Queuing Protocol (AMQP)

AMQP is a pub-sub protocol that is based on TCP/IP, and which focuses on not losing messages regardless of failures and reboots.  This characteristic makes AMQP attractive for robust IoT applications. If you are an AMQP expert and would like to help us add support for AMQP, please get involved.

## Discovery

Discovery for the Web of Things involves a mix of techniques. These include mDNS and UPnP for local area networks, involving a combination of multicast datagrams and caching of messages.  Bluetooth and ZigBee feature discovery and pairing of devices. Bluetooth Smart (aka BLE) supports beacons that broadcast their presence to nearby devices. NFC and barcodes provide further ways to discover services. 

Another approach involves devices registering themselves with brokers that can be queried for available services. The broker can be a local device such as a home hub on a local area network, or it could be a server on the public Internet. The query service can be subject to access control policies to protect the owner's privacy.

Discovery can be based upon social relationships between people, and between people and devices.  This could be based upon centralised social networks, or distributed approaches. One idea involves _personal zones_ that enable people to manage their devices and services, and to set access control policies for sharing these with their social contacts. Your personal zone is associated with a URI that can be used to access it.

The relationship between things provides a further basis for discovery. The relationships are defined through the models for things, where a thing has properties whose values are other things. Search engines can thus discover new things by examining the models for things they already know. This is analogous to how search engines discover web sites by examining the HTML for the pages of sites they already know.

### Abstraction Layer for Discovery

We're looking to simplify discovery by decoupling scripts from the details of the underlying mechanisms outlined above. The idea is to provide a unified query API that can be configured to use a local or remote broker or some combination thereof. We want to evolve this approach through practical implementation experience with a wide variety of use cases and contexts. Some obvious questions include: what information needs to be passed to the query API to specify the context for the search? Can the range of mechanisms used for satisfying queries be described by a policy of some kind? The discovery agent integrated as part of a Web of Things server could talk to other agents to expand its effectiveness. The aim is to simplify discovery for regular script writers by handing the difficult work over to system programmers and a distributed network of discovery agents. Discovery is tightly coupled to privacy, authentication and access control.

**We need your help to collect relevant use cases!**

## Security, Privacy and Resilience

Security will be very important to the growth of the IoT, and we are looking for help. For an indication of what we're considering, please see the list of topics for security metadata earlier in this document.

In essence, we need good security practices to protect the Web of Things from unauthorised monitoring and attacks.  This will involve a layered approach depending upon the need. For example, it may be appropriate to encrypt different kinds of data with different keys, despite running on top of the encryption offered by transport level security (TLS).

Resilience is about system level robustness. The large number of IoT devices will make hardware and software faults inevitable. How to detect and work around these faults. Likewise for how to detect and gracefully work around cyberattacks, or even unpexpected spikes in demand for services. This suggests the need for monitoring the system behaviour and raising alerts, and for policies for adapting to changes.

A related requirement is to make systems resilient to different versions of services.  Can we enable today's services to work with yesterday's devices, and likewise for tomorrow's devices? One idea is to allow services to ignore new fields that they don't understand. This can include embedded data blobs that need to be passed on to services that know how to deal with them. 

We should be able to learn from experience with Linux package management systems which have proven to be very successful when it comes to managing dependencies between software packages and libraries. In essence, this involves adding version numbers to thing descriptions, along with constraints on version numbers for the things, this thing depends upon.  For this to work effectively, we need a framework for updating services, and for having multiple versions available at the same time.  A framework for updating services will also be essential for addressing security flaws.

Privacy can be approached in terms of access control mechanisms based on rules or capability tokens, and terms and conditions that define a business relatonship between the suppliers and consumers of services.
