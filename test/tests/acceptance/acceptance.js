'use strict';

var http = require('http');

var chai = require('chai'),
    expect = chai.expect;

var rester = require('../../../src');

describe('Acceptance', function () {

    context('When completing a successful GET request', function () {
        var responseStatus,
            responseText,
            response;
        beforeEach(function (done) {
            var server = http.createServer();
            server.on('request', function(request, response) {
                if (request.url === '/hello') {
                    // Hello, world!
                    response.statusCode = 200;
                    response.setHeader('Content-Type', 'text/plain');
                    response.write('Hello, world!');
                    response.end();
                } else {
                    response.statusCode = 404;
                    response.setHeader('Content-Type', 'text/plain');
                    response.write('Not found');
                    response.end();
                }
            });
            server.listen(8761);

            var client = new rester.Client({});
            var request = client.request('GET http://localhost:8761/hello');
            request.on('response', function () {
                response = this.response;
                done();
            });
            request.send();
        });
        it('Recieves status code', function () {
            expect(response.toString()).to.match(/^HTTP\/1\.1 200/);
        });
        it('Recieves response body', function () {
            expect(response.toString()).to.match(/Hello, world!$/);
        });
    });

});
