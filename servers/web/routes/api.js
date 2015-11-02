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

router.route('/thing/model')
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


router.route('/things/list')
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


router.route('/thing/property/get')
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
        var property = request.property;
        if (!property) {
            return handleError('invalid request property parameter', res);
        }
        
        thing_handler.get_thing_async(thing_name, function (err, thing) {
            if (err) {
                return handleError('property get error', res);
            }
            
            // get the property asynchronously so the remote property can be retrieved in case the thing is a remote proxy
            thing.property_get(property, function (err, value) {
                if (err) {
                    handleError(err, res);
                }
                else {
                    var response = {
                        thing: thing_name,
                        property: property,
                        value: value
                    };
                    return res.json(response);
                }
            });
        });
    }
    catch (e) {
        return handleError(e, res);
    }
});


module.exports = router;