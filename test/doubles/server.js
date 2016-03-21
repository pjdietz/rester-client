'use strict';

const fs = require('fs');
const http = require('http');
const https = require('https');
const path = require('path');

function createHttpServer(port) {
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
            let location = '/hello';
            let parts = request.url.slice(1).split('/');
            let code = parts[1];
            let n = Number(parts[2]);
            if (n > 1) {
                location = '/redirect/' + code + '/' + (n - 1);
            }
            response.statusCode = code;
            response.setHeader('Location', location);
            response.end();
        } else if (request.url.startsWith('/redirect-loop/')) {
            // Redirect the client between /redirect-loop/foo to
            // /redirect-loop/bar
            let location = '/redirect-loop/foo';
            if (request.url === '/redirect-loop/foo') {
                location = '/redirect-loop/bar';
            }
            response.statusCode = 302;
            response.setHeader('Location', location);
            response.end();
        } else if (request.url.startsWith('/redirect-to/')) {
            // Redirect to an arbitrary URI
            let location = decodeURIComponent(
                request.url.slice('/redirect-to/'.length));
            response.statusCode = 302;
            response.setHeader('Location', location);
            response.end();
        } else if (request.url === '/echo') {
            // Response body will contain Request body
            response.statusCode = 201;
            if (request.headers['content-type']) {
                response.setHeader('Content-Type', request.headers['content-type']);
            }
            request.pipe(response);
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

function createHttpsServer(port) {
    // Create and start an HTTPS server.
    const httpsServer = https.createServer({
        key: fs.readFileSync(path.resolve(__dirname, "https/key.pem")),
        cert: fs.readFileSync(path.resolve(__dirname, "https/cert.pem"))
    });
    httpsServer.on("request", function (request, response) {
        // GET /: Hello, world!
        response.statusCode = 200;
        response.setHeader("Content-Type", "text/plain");
        response.write("Hello, secret robot Internet!");
        response.end();
    });
    httpsServer.listen(port);
}

module.exports = {
    createHttpServer: createHttpServer,
    createHttpsServer: createHttpsServer
};
