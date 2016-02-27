'use strict';

var http = require('http');

var chai = require('chai'),
    expect = chai.expect,
    sinon = require('sinon'),
    sinonChai = require('sinon-chai');

var Transaction = require('../../../src/transaction.js');

chai.use(sinonChai);

describe('Transaction', function () {

    var port = 8761,
        server;

    before(function () {
        server = http.createServer();
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
    });

    after(function () {
        server.close();
    });

    beforeEach(function () {

    });

    function createHelloTransaction() {
        return new Transaction({
            protocol: 'http:',
            hostname: 'localhost',
            port: port,
            method: 'GET',
            path: '/hello'
        });
    }

    context('Request with no body or redirection', function () {
        var transaction;
        beforeEach(function () {
            transaction = new Transaction({
                protocol: 'http:',
                hostname: 'localhost',
                port: port,
                method: 'GET',
                path: '/hello'
            });
        });
        context('When request is sent', function () {
            var listener = sinon.spy();
            beforeEach(function () {
                transaction.on('request', listener);
                transaction.send();
            });
            it('Emits "request" event', function (done) {
                setTimeout(function () {
                    expect(listener).called;
                    done();
                }, 10);
            });
            it('Provides request as string', function (done) {
                setTimeout(function () {
                    expect(transaction.getRequest()).to.contain('GET /hello HTTP/1.1');
                    done();
                }, 10);
            });
        });
        context('When response is receieved', function () {
            var responseListener,
                endListener;
            beforeEach(function () {
                responseListener = sinon.spy();
                endListener = sinon.spy();
                transaction.on('response', responseListener);
                transaction.on('response', endListener);
                transaction.send();

            });
            it('Emits "response" event', function (done) {
                setTimeout(function () {
                    expect(responseListener).called;
                    done();
                }, 10);
            });
            it('Emits "end" event', function (done) {
                setTimeout(function () {
                    expect(endListener).called;
                    done();
                }, 10);
            });
            it('Provides response as string', function (done) {
                setTimeout(function () {
                    expect(transaction.getResponse()).to.contain('HTTP/1.1 200 OK');
                    expect(transaction.getResponse()).to.contain('Hello, world!');
                    done();
                }, 10);
            });
        });
    });
});
