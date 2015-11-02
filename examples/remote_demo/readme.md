# WoT Framework Demo 

Run this file with "node demo.js" from this directory to create a new instance of WoT server on the local machine (or on a remote server) to test the communication between two WoT server instances.

Go to the examples directory and start the remote server:

cd examples

node remote_demo/demo.js

Once the remote_demo/demo.js is started run "node demo.js" from the /examples/demo directory. 

node demo/demo.js

The demo/demo.js WoT will send the property get/set, actions and patch to the remote_demo/demo.js WoT with regards to the door33 thing. The remote_demo/demo.js will send property updates and events of door33 to the HTTP endpoint of demo/demo.js.

Open a browser session at http://localhost:8888 and then click on the "Things" menu item to view and manage the demo things. The door33 temperature changes every 2 second, the door's bell event is signalled every 30 seconds and if the systems work properly then the user interface is notified about the changes. When the actions and patch are invoked from the UI then the console should print debug messages.

Open a second, third, etc. browser session  at http://localhost:8888 and then click on the "Things" menu item. The web socket transport should notify all broswer session upon property changes and events.





