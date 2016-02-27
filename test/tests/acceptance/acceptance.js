'use strict';

var http = require('http');

var chai = require('chai'),
    expect = chai.expect;

var rester = require('../../../src');

describe('Acceptance', function () {

    var server;

    before(function () {
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
        server.listen(8761);
    });

    after(function () {
        server.close();
    });

    context('When completing a successful GET request', function () {
        var response;
        beforeEach(function (done) {
            var client = new rester.Client({}),
                transaction = client.request('GET http://localhost:8761/hello');
            transaction.on('end', function () {
                response = this.getResponse();
                done();
            });
            transaction.send();
        });
        it('Recieves status code', function () {
            expect(response).to.match(/^HTTP\/1\.1 200/);
        });
        it('Recieves response body', function () {
            expect(response).to.match(/Hello, world!$/);
        });
    });

});
