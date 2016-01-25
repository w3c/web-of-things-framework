
'use strict'

var Map = require("collections/map");

module.exports = KadLocalStorage

var EventEmitter = require('events').EventEmitter
var map = new Map();

function KadLocalStorage(namespace) {
    if (namespace.indexOf('_') >= 0) throw new Error('Invalid namespace, character "_" in the namespace and account name is not allowed')
    this._prefix = namespace + '_'
}

KadLocalStorage.prototype.get = function (key, cb) {
    var val = map.get(this._prefix + key);
    if (!val) return cb(new Error('not found'));
    try {
        val = JSON.parse(val)
    } catch (err) {
        return cb(err)
    }
    cb(null, val)
}

KadLocalStorage.prototype.put = function (key, val, cb) {
    key = this._prefix + key;
    map.set(key, JSON.stringify(val));
    var inserted_val = map.get(key);
    cb(null, inserted_val)
}

KadLocalStorage.prototype.del = function (key, cb) {
    key = this._prefix + key;
    map.delete(key);
    cb(null)
}

KadLocalStorage.prototype.createReadStream = function () {
    var storage = this
    var stream = new EventEmitter()
    setTimeout(function () {
        var len = localStorage.length
        for (var i = 0; i < len; i++) {
            var unprefixedKey = localStorage.key(i)
            var isOwnKey = unprefixedKey.indexOf(storage._prefix) === 0
            if (!isOwnKey) continue
            var key = unprefixedKey.substring(storage._prefix.length)
            storage.get(key, onGet.bind(null, key))
        }
        stream.emit('end')
    })
    return stream
    
    function onGet(key, err, val) {
        if (err) return stream.emit('error', err)
        stream.emit('data', { key: key, value: val })
    }
}
