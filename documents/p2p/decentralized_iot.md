# Decentralized peer-to-peer Internet of Things.

A decentralised, peer-to-peer (P2P) system is a collection of applications run on several local computers, which connect remotely to each other to complete a function or a task. A decentralised peer to peer overlay network manages connections between human and Internet of Things peers. The participants in the network are the peer nodes. The peer to peer network is scalable and an unlimited number of nodes can participate in the network.

Centralized corporate owned cloud is certainly an easier way to build out IoT platforms; however, the owners and authorities of these topologies have an influence upon the network and can exploit it. They can ban devices, spy on devices, and compromise the data integrity of the devices. In fact, the government can order the cloud owners to do all of these things.

In the near future, the doors, air condition units, and security system of homes will be fully internet connected. The users will be able to control their home automation system from a mobile phone device. It is essential that only the end user has full control over the IoT devices. Decentralised P2P Internet of Things aims to provide users with such exclusive control.

The purpose of the readme is to describe 
* security, including authentication, access control and data integrity
* device discovery
* existng and new standards 
* protocols

for decentralised P2P Internet of Things.

### Security
A decentralised P2P IoT system performs public private key infrastructure based authentication and access control functions to securely connect peer nodes. The application generates at least one private/public key pair on each peer node including on the Internet-of-Things devices. The actors of the system publish their public keys to the peer to peer network via a Kademlia distributed hash table (DHT). Each peer node knows the public key of the other connected peer nodes. The system identifies peer nodes in the peer to peer network by their public key. To ensure data integrity the nodes sign the messages with their private key. The nodes sign all messages - there are no unsigned messages circulated in the system. The requirement for signing the messages also help to mitigate the risks of Sybil attacks and DDoS attacks.   
The [device discovery readme](items/security.md) describes the scurity design and implementation for decentralised P2P IoT.


### Device discovery
Decentralised IoT allows providers and context producers to register their IoT Objects on the network, and in turn allow context consumers to discover them in a secure and peer to peer manner.     
The [device discovery readme](items/device_discovery.md) describes device discovery in decentralised P2P IoT.

### Standards 
The [standards readme](items/standards.md) describes the decentralised P2P IoT standardization process.


### Protocol design
The [protocols readme](items/protocol.md) describes existing and suggests new protocols for decentralised P2P IoT.