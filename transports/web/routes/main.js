var express = require('express');
var logger = require('../../../logger');
var thing_handler = require('../../../libs/thing/thing_handler');


var router = express.Router();

/* GET home page. */
router.get('/', function (req, res) {
    res.render('index');
});

router.get('/things', function (req, res) {
    res.render('things');
});

router.get('/docs', function (req, res) {
    res.render('docs');
});

router.get('/tutorials', function (req, res) {
    res.render('tutorials');
});


module.exports = router;