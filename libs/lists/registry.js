
/*
    Use this object to maintain the eregisteres things list. This object is accessible from all decoupled components such as the routers
    and can be extended into a persistent store on a load balanced implementation that will address high availability requirements
*/

var registry;
var _regarray;

if (!registry) {
    _regarray = {};
    registry = _regarray;
}

module.exports = registry;