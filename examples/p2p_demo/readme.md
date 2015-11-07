## WoT Framework P2P (peer to peer) Demo 

Run the P2P demo by executing "node demo.js" from the \examples\p2pdemo directory.

The P2P architecture implements a decentralized Kademlia distributed hash table (DHT) and peer to peer network via the UDP transport layer. 

The P2P design aims to utilize the scalability and high availability features of decentralized network concept. Having no central server theoretically means no central point of failure, at least not terms of server infrastructure. The solution is scalable – in fact more devices on the network should result in more optimal data propagation and increased security.

The main purpose of the DHT is to provide a device discovery as well as decentralized data storage for devices. 

This is a hybrid design as there is a direct communication is possible with the devices via UDP peer to peer messaging (TODO).

The message handling uses JSON Web Token (JWT). Currently only supports ECC based cryptography, ES256, ES384, ES512 algorithms. The message signature complies with JSON Web Signature (JWS) standards. (TODO: encrypt messages in direct peer to peer communication with shared symmetric cryptography keys of authorized users and devices. The cryptography keys are shared with authorized users using Diffie-Hellman key exchanges)

This particular demo demonstrates two smart cars, a Toyota and a Ford. The vehicles update a public traffic information database with their speed and location, so once there are a large number of cars participate in the network, big-data handlers could provide end users with traffic info with regards to a particular location.  

The demo vehicles raise events upon exceeding a predefined speed limit as well signal an event when the door is opened. Designated users, security companies, etc. can receive the events, the events aren’t exposed to the public network and encrypted with the shared symmetric cryptography key of authorized users and the device. More events will be added to the demo to demonstrate diagnostic and security related events (TODO).
