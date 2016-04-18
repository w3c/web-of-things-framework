## WoT Framework Demo 

Run this demo with "node demo.js" to create a WoT server to communicate with the simulator objects via the HTTP protocols. Real IoT devices would use this system similarly via the HTTP protocol as the simulator objects. The simulator and device objects communicates with the default HTTP end point of WoT server. The simulator and device objects expose an HTTP listener to receive messages from the WoT system. The WoT system uses an adapter object at /libs/adapters/http.js to send messages to the simulators/devices.

This demo wires up the door12 and switch12 simulator devices.

Once the Wot server is running open a browser session at http://localhost:8888 and then click on the "Things" menu item to view and manage the demo things.
Please note the web server port is configured in the config file that is in the same directory as the demo.js file.

The door12 battery level changes in every 10 seconds, the door beel event is signalled in every 30 seconds and if the systems works properly then the user interface is notified about the changes. By unlocking and locking the door the device simulator changes the "is_open" property and the UI receives notification about the change.

Once the "on" property of the switch12 device is selected, the UI should be notified with the power consumption property level in every 10 seconds. 

To run the remote proxy device "door33" with this HTTP demo the remote WoT instance must be operational (see the remote_demo example) as well as the global.is_door33_defined variable must be set to "true" at the top of demo.js file.




