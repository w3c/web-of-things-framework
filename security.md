# Web of Things Security

This document aims to define security guidelines for IoT devices that currently run without any security. It will also provide a framework for barebones device installations so that new devices can be deployed with embedded security in place. 

Internet-of-Things devices need to have some form of connectivity to the outside world, which usually results in significant security issues that businesses and residential users need to consider. The connected devices require a security protocol and its security policy should be in line with the security policy of the enterprise, or in the case of residential users, provide users with security in using the devices. 

These Internet connected devices can easily expose businesses and homes to various external security threats. As of writing there is no common, open standard, robust or proven authorization and access control protocol in existence for Internet-of-Things devices. Of the numerous service providers rolling out devices and services, almost all of them implement their own security protocols, API and infrastructure. Consequently the development of custom security implementations increases the price of the product and the lack of standards increases the security risks. 

Existing systems tend to use custom authorization and access control schemes with domain specific login portals for user name/password based logins instead of using the open standard and robust Public Private Key Infrastructure based security, for instance.

It is troubling that robust security was not taken into account with majority of Internet of Things implementations. The data of IoT devices are being harvested in an automated fashion but who has access to the data? What functions can a human or another machine execute on the IoT device? Is my office door actually being opened by a former employee who is not supposed to enter the premise anymore? Is the data being forwarded by the IoT device compromised at all during its way to the end-user, never mind whether or not it was sent by the actual device and not in fact by an intruder?

The Internet of Things has the potential to facilitate and bring together every aspect of different connected devices. Therefore, cyber and physical security solutions must also work together to produce comprehensive and secure device control in real time - ideally using security implementations based on robust open standards.
The lack of security for IoT devices indicates that security is treated as a kind of afterthought as it was during the early days of the internet. The challenge before us is immense as the tasks of low power devices are often critical - many times even life critical such as a wireless IoT ECG device - and all control command facilitation is happening on a real time system, which makes even more difficult to implement robust security. 

More and more homes are exposed to security threats via Internet of Things devices. The simplest and most common forms of that are the various Internet connected home monitoring video cameras and baby monitors which often connect to RTMP servers run by companies with unknown security policies and using the default user name "admin" and blank password for authentication. No wonder there were already hacking events where hackers could compromise home video cameras on the scale of thousands of devices.
There is no workaround for the need of addressing security requirements. Security must be the primary concern for Internet of Things applications and framework such as Web of Things. 

### Security threats

As more embedded systems are connected to the Internet, the potential damage from hardware and software level security attacks scale up dramatically. Hardware level attacks such as shack attacks, lab attacks and fab attacks are not in scope for this document. Software related threats that the Web of Things system must address are the following:

##### Capture attacks
Capture attacks typically target the system or the information. Both the system and information capture allows the attacker to disrupt, degrade, destroy and manipulate the resources. The capture of the system likely results in the capture of information and data to which that system has access to. A successful capture attack enables the attacker to limit the access to the device (disrupt), disable functionalities in the system (degrade) or delete entire modules from the software stack (destroy). The manipulation of the system and device could come in many forms, including but not limited to triggering false alarms in a security system to redirect the resources to a particular area or returning an incorrect data from a temperature sensor to the cooler device to causing overheating and explosion.

##### Facilitating attacks on other systems
The Internet of Things devices typically connect to other devices. In an automated home often dozens of devices operate and as such provides attackers with ample opportunities to create sophisticated interconnected attacks. For example a compromised Internet of Things gateway device could be used to launch a denial of service attack.

##### Creating safety risks
Unauthorized persons might exploit security vulnerabilities to create risks to physical safety in some cases. The attacker could hack remotely into internet connected medical devices such as insulin pumps and change their settings so that they no longer delivered medicine. Unauthorized access to Internet-connected cameras or baby monitors also raises potential physical safety concerns. There can be safety risk via obtaining unauthorized access to IoT data and then performing data analysis and data mining. Data collected by fitness and other devices that track consumers’ location over time could endanger consumers’ physical safety. A data thief could remotely access data about energy usage from smart meters to determine whether a homeowner is away from home.

##### Noninvasive attacks
Embedded systems are especially susceptible to a type of noninvasive attack called a side-channel attack. Non-invasive techniques are usually performed via software attacks using viruses and malicious software code, the attacks are often based on the statistical analysis of operational characteristics of the device to capture and extract confidential information. The attacker aims to gain access to the data handled by the device and try to put the system out of order.

##### Network attacks
The attacks on the communication network could compromise Internet of Things device security, particularly data integrity. The resist replay attack is a form of network attack in which a valid data transmission is manipulated, typically maliciously or fraudulently repeated or delayed. The attack is carried out either by the originator or by an adversary who intercepts the data and retransmits it, possibly as part of a masquerade attack by IP packet substitution. The man-in-the-middle attacks is an attack where the attacker secretly relays and possibly alters the communication between two parties who believe they are directly communicating with each other.

Apart from the aforementioned attacks, the rapid growth of IoT devices leads to a variety of potential risks concerning information security and both privacy, data protection and device usage, which must be considered. There are previously unknown risks appearing such as user lock-in. There is an increased risk of consumers being locked-in a specific IoT service provider, making it difficult for them to migrate from one provider to the other. Such a dependency would be detrimental for users having control over their data and the right to choose providers (this underlines the importance of open standards which presumably lowers the risk of one provider gaining market dominance).

### Web of Things Security
The Web of Things security primarily addresses four areas of concern to handle security threats:
*	Authentication. To manage who can connect, view and control Internet of Things devices. 
*	Access control. To manage what the connected entity (human or machine) can do on the Internet of Things device. 
*	Data integrity. To ensure the data between connected parties is not compromised.
*	Device provisioning. Orchestrates authentication, access control and data integrity services to provide IoT services to users.

(Security on device booting, low level device resources and peripherals are not in the scope for this document. Security implementations such as ARM Trust Zone address those requirements and this document aims to instead define security guidelines for higher application layers.)

To manage those tasks a security agent software module is implemented which orchestrates the security between devices and end-users. 

Sensors and actuators powered by low power microcontrollers don't have the computing power to run the TCP/IP stack and typically won't be connecting directly to Web of Things servers. For instance, a temperature sensor using 8 bit AVR microcontroller with 16kb Flash will not have direct access to the WoT servers. In most use cases the sensor will connect via an IoT gateway that is capable of running the client or server application stack of WoT.  Having said that, there are more and more sensors that employ more capable ARM MCUs which can load the TCP/IP stack and the full WoT framework. For more powerful IoT sensors like these there is no need for an IoT gateway and the security agent will be residing on the sensor. Either case, the security agent software module facilitates security between connected parties and is also responsible for authentication, access control and ensuring data integrity.

The security is based on public/private key cryptography infrastructure (PPKI). PPKI enables to implement elegant and efficient security to help identify the entities of the system, perform authentication and ensure data integrity (using cryptography signatures). The standard way to manage Internet-of-Things nodes from an authorization perspective is using the robust, widely adopted and well tested public/private key infrastructure and certificates. To ensure confidentiality and secure communications, the core part of security should ideally be based on PPKI paired with an adequate PPKI certificate management. Using the public/private key infrastructure would pave the way for the deployment of a robust and secure authentication and access control scheme. The parties are identified by their public key. The authenticity of messages and the identities of the actors are then verified using PPKI cryptography routines. Using a PPKI infrastructure based security scheme would greatly simplify the authentication, access control and identity management aspects of Internet-of-Things security.  The Elliptic curve cryptography (ECC) scheme is particularly suitable for IoT devices. The small footprint of ECC allows security modules to be implemented on embedded devices.  ECDH is a trusty and proven key agreement protocol and the using the ECDSA digital signature algorithm ensures data integrity.

The security agent performs public private key infrastructure based authentication and access control functions to securely connect machines to machines or machines to humans. The security agent must generate at least one private/public key pair for each connected IoT device. The actors of the system publish their public keys to the network where each entity knows the public key of the other connected human or machine.  Therefore the system identifies each of the entities by their ECC public key. Collision resistant hash functions such as SHA-256 and SHA-512 are used to create hash of data which can be signed using the private key to guaranty data integrity and provide information about the originator of the data. To ensure data integrity the messages, control commands, event data, requests and responses are signed with the ECC private key, and the signature can be verified using ECDSA. Ideally, to ensure integrity of data each entity must sign all messages with their private key

The system implements access control management functions. All Internet-of-Things devices on the system are accessible from the network (because they are on the Internet), but not necessarily all functions are exposed to all entities. From an access control policy viewpoint there must be differentiated control over the devices. For example an ECG wireless sensor that publishes its heart rate and ECG data via the Web of Things framework, makes its heart rate data available for public databases for research reasons, but the ECG data is only accessible to the cardiologists of the individual wearing the device. The system allows users to define complex access control rules.  This function is particularly important for home and building automation systems, e.g. who can open which door in the building. The implementation typically will consist of a lookup collection (linked list, map, etc) to store the public key of clients together with the access rights of the users. The look up collection is maintained by the security agent module either by long pulling the security settings from the Web of Things server or providing an event driven interface that can be called by the connected entities to refresh the security settings.

There are interfaces for existing authorization standards such as OAuth and protocols like CoAP, and then implementations can be rolled out to connect to the Web of Things security from web end user to device and device to web end user respectively.

#### Using existing standards
The Web of Things security uses existing open standards. 

The open standard security token format JSON Web Token (JWT), the encrypted content open standard JSON Web Encryption (JWE), the JSON Web Algorithms (JWA) open standard specification that registers cryptographic algorithms and identifiers and the JSON Web Signature (JWS) open standard that represents content secured with digital signatures or Message Authentication Codes (MACs) using JSON-based data structures will be utilized in Web of Things security.

WoT security utilize the Authentication and Authorization for Constrained Environments (ACE) to manage authentication and authorization and the JSON Object Signing and Encryption (JOSE) for secure object format encoding.

The cryptographic keys are represented in WoT security by the JSON Web Key (JWK) standard that is a JavaScript Object Notation (JSON) data structure. 



## Implementation and design details

The basic premises of the WoT security are
*	Things and human users use public/private key (PPK) infrastructure and PPK cryptography functions to secure messages
*	Each actors of the system must generate a public/private key pair. (Typically keys generated prior to configuring the device and will be burned into the devices' firmware). 
*	The Thing/user publishes the public key to other users of the system.
*	The data integrity and authenticity of the messages is guaranteed with PPK signatures
*	All messages between users are secured with AES 128 and AES 256 symmetric encryption/decryption. 
*	The system uses Diffie Hellman key exchange algorithms to facilitate the exchange and security of session keys.

#### Elliptic Curve Cryptography (ECC)
Mainly due to the limited resources on embedded devices the WoT system uses Elliptic Curve Cryptography. As the computation power available to attackers continues to increase, cryptography system must use stronger keys. The below table summarizes what are the various algorithm-key size combinations. 

Various algorithm-key size combinations

![image](https://cloud.githubusercontent.com/assets/778649/11066987/4b923d04-87c2-11e5-9d97-f8ababc1bd5d.png)



Key strength vs MIPS years required to break

![image](https://cloud.githubusercontent.com/assets/778649/11066996/5230a9ca-87c2-11e5-9dcc-d93843792e2d.png)


The aim should be using AES-256 for symmetric data encryption rather than the prior accepted AES-128 protocol. For elliptic curve sessions the the system eventually will use strong 512–bit keys. To achieve the same level of security with RSA encryption, 15,360 bit keys are required, which is computationally infeasible in embedded systems today. This stark contrast between the feasibility of ECC over RSA for embedded systems indicates that ECC is the algorithm of the future for embedded systems. (source: http://www.atmel.com/images/atmel-8951-cryptoauth-rsa-ecc-comparison-embedded-systems-whitepaper.pdf )
The latest researches with regards to the attacks on Diffie-Hellman key exchange (source: https://weakdh.org/imperfect-forward-secrecy-ccs15.pdf) also indicate that ECC is the adequate cryptography approach for embedded devices. Researchers exploited flaws in Diffie-Hellman using Logjam Attack. Researches also suggest that that it is plausibly within NSA’s resources to have performed number field sieve precomputations for at least a small number of 1024-bit Diffie-Hellman groups. This would allow them to break any key exchanges made with those groups in close to real time. Therefore the solution is to use stronger keys, which make ECC the only viable PPK approach for embedded devices.

### UML Diagrams

###### High level component diagram

This component diagrams describes the authentication and message modules and handlers of the the WoT security implementation.  WoT uses ECC cryptography by default, but - as most likely many existing devices use RSA cryptography - the system also implements and allows using RSA crypto functions.

![image](https://cloud.githubusercontent.com/assets/778649/11097088/39a79cfa-8895-11e5-8f40-461fbabc9dfb.png)


###### High level message send activity diagram

This high level UML activity diagram describes the WoT message create process.

![image] (https://cloud.githubusercontent.com/assets/778649/11069210/f728cee4-87cc-11e5-8ef2-3440c762eb7d.png)
