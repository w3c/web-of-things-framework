// simple HTTP server - put static resources in ./www/
// only supports a limited set of file extensions
// could be easily extended to handle request body

var port = 8888;
var base = 'http://localhost:' + port + '/'; // base URI for models on this server

var http = require("http");
var url = require('url');
var path = require('path');
var fs = require('fs');

var mime_types = {
    "html": "text/html",
    "txt": "text/plain",
    "js": "text/javascript",
    "json": "application/json",
    "css": "text/css",
    "jpeg": "image/jpeg",
    "jpg": "image/jpeg",
    "png": "image/png",
    "gif": "image/gif",
    "ico": "image/x-icon"
};

var registry; // mapping from id to model and thing

function set_registry(map) {
    registry = map;
}

http.createServer(function(request, response) {
    var uri = url.parse(url.resolve(base, request.url));

    console.log('HTTP request: ' + request.method + ' ' + uri.path);

    if (request.method === "GET" || request.method === 'HEAD') {
        if (/^\/wot\/.+/.test(uri.path)) {
            var id = uri.href;
            console.log('found id: ' + id);
            var entry = registry[id];
            var body;

            console.log('entry for: ' + id + ' = ' + JSON.stringify(entry));

            if (entry && entry.model) {
                body = JSON.stringify(entry.model);

                response.writeHead(200, {
                    'Content-Type': mime_types.json,
                    'Pragma': 'no-cache',
                    'Cache-Control': 'no-cache',
                    'Content-Length': body.length
                });
            } else {
                body = "404 not found: " + request.url;
                response.writeHead(404, {
                    'Content-Type': 'text/plain',
                    'Content-Length': body.length
                });
            }

            if (request.method === "GET")
                response.write(body);

            response.end();
            return;
        }

        if (uri.path === '/')
            uri.path = '/index.html';

        var filename = './www' + uri.path;

        fs.stat(filename, function(error, stat) {
            var ext = path.extname(filename);
            var mime = null;

            if (ext.length > 1)
                mime = mime_types[ext.split(".")[1]];

            if (error || !mime) {
                var body = "404 not found: " + request.url;
                response.writeHead(404, {
                    'Content-Type': 'text/plain',
                    'Content-Length': body.length
                });

                if (request.method === "GET")
                    response.write(body);

                response.end();
            } else {
                response.writeHead(200, {
                    'Content-Type': mime,
                    'Pragma': 'no-cache',
                    'Cache-Control': 'no-cache',
                    'Content-Length': stat.size
                });

                if (request.method === "GET") {
                    var stream = fs.createReadStream(filename);
                    stream.pipe(response);
                } else
                    response.end();
            }
        });
    } else // unimplemented HTTP Method
    {
        var body = "501: not implemented " + request.method + " " + request.url;
        response.writeHead(501, {
            'Content-Type': 'text/plain',
            'Content-Length': body.length
        });
        response.write(body);
        response.end();
    }
}).listen(port);

console.log('started http server on port ' + port);

exports.set_registry = set_registry;