# WoT Framework Demo 

Run this file with "node demo.js" from this directory to create an other WoT server on the local machine (or of course on a remote server) to test the communication between two WoT server.

Go to the examples directory

cd examples

Start the remote server

node remote_demo/demo.js

Once the remote_demo/demo.js is started run "node demo.js" from the /examples/demo directory. 

node demo/demo.js

The demo/demo.js WoT will send the property get/set, actions and patch to the remote_demo/demo.js WoT. The remote_demo/demo.js will send property updates and events to the HTTP endpoint of demo/demo.js.

Open a browser session at http://localhost:8888 and then click on the "Things" menu item to view and manage the demo things. The door33 temperature changes every 2 second, the door beel event is signalled every 30 seconds and if the systems work then the user interface is notified about the changes.





