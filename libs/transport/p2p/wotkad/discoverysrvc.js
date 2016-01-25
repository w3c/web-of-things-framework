/*
 
Streemo - Real time communication system for humans and machines

Copyright (C) 2016 T. Z. Pardi

This program is free software; you can redistribute it and/or modify it under the terms of the GNU General Public License as 
published by the Free Software Foundation; either version 2 of the License, or (at your option) any later version.

This program is distributed in the hope that it will be useful, but WITHOUT ANY WARRANTY; without even the implied warranty 
of MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the GNU General Public License for more details.

*/

var config = require('config');
var restify = require('restify');

var logger = global.applogger;

function completeRequest(err, data, res, next) {
    try {
        if (err) {
            res.send(200, { error: err });
        }
        else if (!data) {
            res.send(200, { error: 'no data is available' });
        }
        else {
            res.send(200, { result: data });
        }
        return next();
    }
    catch (e) {
        res.send(200, { error: e.message });
        return next();
    }
}



var server = restify.createServer();
server
  .use(restify.fullResponse())
  .use(restify.bodyParser());


server.post('/seeds', function create(req, res, next) {
    try {
        //  return the known seeds of the network
        var error = null, data = null;

        var list_of_seeds = config.get('list_of_seeds');
        if (!list_of_seeds.length) {
            error = "invalid list of seeds data";
        }
        else {
            data = list_of_seeds;
        }

        completeRequest(error, data, res, next);
    }
    catch (e) {
        try {
            completeRequest(e, null, res, next);
            logger.error(e);
        }
        catch (e) {
            console.log("fatal error in 'server.post('/seeds')' error: %j", e);
        }
    }
});


function start_server(callback) {
    //  32319 is the generic Streemo discovery port
    server.listen(32319, function () {
        logger.debug('%s listening at %s', server.name, server.url);

        callback();
    });
}

exports.start = start_server;