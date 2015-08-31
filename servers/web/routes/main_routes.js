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


// handle the thing get requests
router.route('/wot/things_list')
    .get(function (req, res) {
    
    try {
        db.things_list(function (err, things) {
            if (err) {
                res.send("404 not found. Thing: " + thing);
            }
            else if (!model) {
                res.send("404 not found. Thing: " + thing);
            }
            else {
                var response = {
                    thing: thing,
                    model: model
                };
                return res.json(response);
            }
        });
    }
    catch (e) {
        logger.error(e);
    }
});

// handle the thing get requests
router.route('/wot/:thing')
    .get(function (req, res) {
    
    try {
        var thing = req.params.thing;
        if (!thing) {
            return res.send('Error: invalid thing identifier');
        }
        
        thing_handler.get_model(thing, function (err, model) {
            if (err) {
                res.send("404 not found. Thing: " + thing);
            }
            else if (!model) {
                res.send("404 not found. Thing: " + thing);
            }
            else {
                var response = {
                    thing: thing,
                    model: model
                };
                return res.json(response);
            }
        });   
    }
    catch (e) {
        logger.error(e);
    }
});

module.exports = router;