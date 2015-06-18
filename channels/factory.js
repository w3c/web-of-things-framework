
var ChannelFactoryMap = require('./factorymap.js');
var WebSocketChannelFactory = require('./ws/factory.js');


var wsFactory = new WebSocketChannelFactory();
ChannelFactoryMap.register(wsFactory.protocol(), wsFactory);

module.exports = ChannelFactoryMap;