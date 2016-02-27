'use strict';

var http = require('http');

var chai = require('chai'),
    expect = chai.expect;

var createServer = require('../../doubles/server').createServer;

var rester = require('../../../src');

describe('Acceptance', function () {

    var port = 8761,
        server;

    before(function () {
        server = createServer(port);
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
