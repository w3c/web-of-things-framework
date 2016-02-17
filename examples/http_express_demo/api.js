var logger = require('../../logger');

/** URL Router */
var express = require('express'),
    router = express.Router();

var create = function(req, res, next) {
    var data = req.params;
    var thing = req.app.thing;
    var model = thing.model;

    if (!data || !data.name || !data.type) {
        return next(new Error('Device HTTP listener error: invalid parameters'));
    }

    try {
        if (!data.type || !data.name || data.name != thing.name) {
            return;
        }

        logger.debug('HTTP device simulator received: ' + data.type + ' from ' + data.name);

        //console.log(req.params);
        switch (data.type) {
            case 'action':
                //  handle the action
                var action = data.action;
                if (model.actions[action]) {
                    model.actions[action]();
                }
                res.json({ result: true });
                return next();
                break;

            case 'patch':
                //  set property
                var property = data.property;
                var value = data.value;
                if (model.properties[property]) {
                    model.properties[property](value);
                }
                res.json({ result: true });
                return next();
                break;

            case 'property_get':
                //  get property
                var property = data.property;
                var value = model.properties.get(property);
                res.json({ thing: thing.name, property: property, value: value });
                return next();
                break;

            default:
                next(new Error('HTTP device listener error: invalid action type'));
                break;
        }
    }
    catch (e) {
        logger.error(e);
        next(new Error('property get error: ' + e.message));
    }

}

router.post('/:name/:type', create);

module.exports = router;
