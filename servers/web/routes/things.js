var express = require('express');
var logger = require('../../../logger');

var router = express.Router();

router.get('/things', function (req, res) {
    res.render('things');
});


module.exports = router;