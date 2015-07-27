var express = require('express');
var logger = require('../logger');
var registry = require('../libs/lists/registry.js'); 

var router = express.Router();

/* GET home page. */
router.get('/', function (req, res) {
    res.render('index');
});

// handle the thing get requests
router.route('/wot/:thing')
    .get(function (req, res) {
    
    try {
        //TODO store only the thing in the registry list
        var thing = req.params.thing;
        if (!thing) {
            return res.send('Error: invalid thing identifier');
        }
        
        var result;
        var fullUrl = req.protocol + '://' + req.get('host') + req.originalUrl;
        var entry = registry[fullUrl];
        if (entry && entry.model) {
            return res.json(entry.model);
        }
        else {
            return res.send("404 not found. Thing: " + thing);
        }      
    }
    catch (e) {
        logger.error(e);
    }
});

module.exports = router;