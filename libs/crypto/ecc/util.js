var crypto = require('crypto')

module.exports = {
  hmacSHA256: hmacSHA256
}

function hmacSHA256(v, k) {
  return crypto.createHmac('sha256', k).update(v).digest()
}