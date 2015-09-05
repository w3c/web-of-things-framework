# WoT Framework Demo 

Run this file with "node remote_demo.js" to create an other WoT server on the local machine (or of course on a remote server) to test the communication between two WoT server.
Once the remote_demo.js is started run "node demo.js" from the /examples/demo directory. The remote thing managed by "demo.js" will be hosted by "remote_demo.js". The "demo.js" WoT will send the property get/set, actions and patch to "remote)demo.js. The "remote_demo_js" will send property updates and events to the HTTP endpoint of "demo.js".


