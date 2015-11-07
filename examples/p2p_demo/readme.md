## WoT Framework P2P (peer to peer) Demo 

Run the P2P demo by executing "node demo.js" from the \examples\p2pdemo directory.

The P2P architecture implements a decentralized Kademlia distributed hash table (DHT) and peer to peer network via the UDP transport layer. 

The P2P design aims to utilize the scalability and high availability features of decentralized network concept. Having no central server theoretically means no central point of failure. The solution is scalable – in fact more devices on the network should result in more optimal data propagation and increased security.

The main purpose of the DHT is to provide device discovery service, decentralized data storage for device data, particularly for devices that are source of big-data, to provide publishing of device schemas and accessibility information as well as facilitate communication between devices and public/private networks. The P2P also suitable for networks with small number of devices if users prefer peer to peer networking over client/server topology.

This is a hybrid design as direct communication is possible with the devices via UDP peer to peer messaging (TODO). In case of direct peer to peer communication the device data is not stored in the DHT.

The message handling uses JSON Web Token (JWT). Currently it supports ECC based cryptography, ES256, ES384, ES512 algorithms. The message signature aims to comply with the JSON Web Signature (JWS) standard. (TODO: encrypt messages in direct peer to peer communication with shared symmetric cryptography keys of authorized users and devices. The cryptography keys are shared with authorized users using Diffie-Hellman key exchanges)

This particular demo demonstrates two smart cars, a Toyota and a Ford. The vehicles update a public traffic information database with their speed and location, so once there are a large number of cars participate in the network, big-data handlers could provide end users with traffic info with regards to a particular location, road, motorway, etc.  

The demo vehicles raise events upon exceeding a predefined speed limit as well signal an event when the door is opened or the vehicle is closed. Designated users, security companies, etc. can receive the events. Such events aren’t exposed to the public network and encrypted with the shared symmetric cryptography key of authorized users and the device. More events will be added to the demo to demonstrate engine, diagnostic and security related events (TODO).
