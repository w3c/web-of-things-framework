## WoT Framework Demo 

Run this demo with "node demo.js" to create a WoT server. 

Once the Wot server is running open a browser session at http://localhost:8888 and then click on the "Things" menu item to view and manage the demo things.
Please note the web server port is configured in the config file that is in the same directory as the demo.js file.

The door12 battery level changes every 2 second, the door beel event is signalled every 30 seconds and if the systems work then the user interface is notified about the changes. By unlocking and locking the door the device simulator should change the "is_open" property and the UI should receive notification about the change.

Once the "on" property of the switch12 device is selected, the UI should be notified with the power consumption property level in every 2 seconds. 

In order to receive notifications for door door33 the remote WoT instance must be operational (see the remote_demo example).

Open a second, third, etc. browser session  at http://localhost:8888 and then click on the "Things" menu item. The web socket transport should notify all broswer session upon property changes and events.


