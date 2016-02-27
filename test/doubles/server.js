'use strict';

var http = require('http');

function createServer(port) {
    var server;
    server = http.createServer();
    server.on('request', function(request, response) {
        if (request.url === '/hello') {
            // Hello, world!
            response.statusCode = 200;
            response.setHeader('Content-Type', 'text/plain');
            response.write('Hello, world!');
            response.end();
        } else if (request.url.startsWith('/redirect/')) {
            // Redirect the client from /redirect/{code}/{n} to
            // /redirect/{code}/{n-1}; If n = 1, redirects to /hello
            (function () {
                var parts, code, n, location = '/hello';
                parts = request.url.slice(1).split('/');
                code = parts[1];
                n = parseInt(parts[2], 10);
                if (n > 1) {
                    location = '/redirect/' + code + '/' + (n - 1);
                }
                response.statusCode = code;
                response.setHeader('Location', location);
                response.end();
            })();
        } else {
            response.statusCode = 404;
            response.setHeader('Content-Type', 'text/plain');
            response.write('Not found');
            response.end();
        }
    });
    server.listen(port);
    return server;
}

module.exports = {
    createServer: createServer
};
