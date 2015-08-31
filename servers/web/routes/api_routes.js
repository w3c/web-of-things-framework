var express = require('express');
var router = express.Router();
var util = require('util');
var thing_handler = require('../../../libs/thing/thing_handler');
var db = require('../../../data/db')();

function handleError(err, res) {
    var obj = {
        error: {}
    };
    
    if (err && err.message) {
        obj.error = err.message
    }
    else if (typeof err === 'string') {
        obj.error = err
    }
    else {
        obj.error = 'Unknown error';
    }
    
    res.send(obj);
}


router.route('/get_thing_model')
    .post(function (req, res) {
    
    try {
        var request = req.body;
        if (!request) {
            return handleError('invalid request parameter', res);     
        }
        var thing_name = request.thing;
        if (!thing_name) {
            return handleError('invalid request thing name parameter', res);
        }

        thing_handler.get_model(thing_name, function (err, model) {
            if (err) {
                handleError(err, res);
            }
            else if (!model) {
                handleError('the thing model is null', res);
            }
            else {
                var response = {
                    thing: thing_name,
                    model: model
                };
                return res.json(response);
            }
        });

        
    }
    catch (e) {
        return handleError(e, res);  
    }    
});


router.route('/things_list')
    .post(function (req, res) {
    
    try {
        db.things_list(function (err, things) {
            if (err) {
                return handleError(err, res);
            }

            if (!util.isArray(things)) {
                return handleError("invalid thing array", res);
            }

            res.json(things);            
        });        
    }
    catch (e) {
        return handleError(e, res);
    }
});


module.exports = router;