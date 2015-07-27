var express = require('express');
var logger = require('../logger');

var router = express.Router();

// middleware specific to this router
//router.use(function timeLog(req, res, next) {
//    logger.debug('request time: ', Date.now());
//    next();
//});


router.get('/wot/:thing', function (req, res) {
    try {
        result = { res: "OK" };
        return res.json(result);
    }
    catch (e) {
        logger.error(e);
        res.send('Error: ' + e.message);
    }
});

module.exports = router;