var crypto = require('crypto')
var secrand = require('secure-random');
var EccKey = require('../../libs/crypto/ecc/EccKey');
var ecdsa = require('../../libs/crypto/ecc/EccDsa');
var eccsign = require('../../libs/crypto/ecc/EccSign');
var eccverify = require('../../libs/crypto/ecc/EccVerify');
var jwt = require('../../libs/message/jwt');
var WoTMessage = require('../../libs/message/wotmsg');

var random_bytes = secrand.randomBuffer(32);
var pwd = crypto.createHash('sha1').update(random_bytes).digest().toString('hex');
var key = new EccKey(pwd);

var wotmsg = new WoTMessage();
var token = wotmsg.create(key.privateKey, { foo: "bar" }, null, 1800, "door12", "some message" );
var decoded = wotmsg.decode(token, key.publicKeyStr);
console.log(decoded.data.foo == "bar");

token = jwt.encode({ data: { foo: "bar" } }, key.privateKey, {expiresIn: 1800, issuer: "door12", subject :"some message"});
decoded = jwt.decode(token, key.publicKeyStr);
console.log(decoded.data.foo == "bar");

var obj = { foo: "bar" };
var signature = eccsign(key.privateKey, obj);
var is_valid = eccverify(key.publicKeyStr, obj, signature);

var msg = new Buffer("hello", 'utf8');
var shaMsg = crypto.createHash('sha256').update(msg).digest();
var signature = ecdsa.sign(shaMsg, key.privateKey);
is_valid = ecdsa.verify(shaMsg, signature, key.publicKey);
console.log(isValid) //true

msg = new Buffer("test", 'utf8');
shaMsg = crypto.createHash('sha256').update(msg).digest();
signature = ecdsa.sign(shaMsg, key.privateKey);
is_valid = ecdsa.verify(shaMsg, signature, key.publicKey);
console.log(isValid);