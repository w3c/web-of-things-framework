
function CryptoHandler(alg, initstr) {
    if (!(this instanceof CryptoHandler)) {
        return new CryptoHandler();
    }

    this.alg = alg;
}

CryptoHandler.prototype.sign = function () {
    var self = this;
    
}


CryptoHandler.prototype.verify = function () {

}


module.exports = CryptoHandler;