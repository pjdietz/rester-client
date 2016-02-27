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
        server,
        requestListener,
        redirectListener,
        responseListener,
        endListener,
        errorListener,
        transaction;

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

    beforeEach(function () {
        requestListener = sinon.spy();
        redirectListener = sinon.spy();
        responseListener = sinon.spy();
        endListener = sinon.spy();
        errorListener = sinon.spy();
    });

    afterEach(function () {
        transaction.removeAllListeners();
    });

    function addListeners() {
        transaction.on('request', requestListener);
        transaction.on('redirect', redirectListener);
        transaction.on('response', responseListener);
        transaction.on('end', endListener);
        transaction.on('error', errorListener);
    }

    // -------------------------------------------------------------------------

    context('Request with no redirection', function () {
        beforeEach(function (done) {
            transaction = new Transaction({
                protocol: 'http:',
                hostname: 'localhost',
                port: port,
                method: 'GET',
                path: '/hello'
            });
            addListeners();
            transaction.send();
            setTimeout(done, 10);
        });
        describe('Events', function () {
            it('Emits "request" once', function () {
                expect(requestListener).calledOnce;
            });
            it('Emits "response" once', function () {
                expect(responseListener).calledOnce;
            });
            it('Emits "end" once', function () {
                expect(endListener).calledOnce;
            });
            it('Does not emits "redirect"', function () {
                expect(redirectListener).not.called;
            });
            it('Does not emit "error"', function () {
                expect(errorListener).not.called;
            });
        });
        describe('Message', function () {
            it('Provides request as string', function () {
                expect(transaction.getRequest()).to.contain('GET /hello HTTP/1.1');
            });
            it('Provides response as string', function () {
                expect(transaction.getResponse()).to.contain('HTTP/1.1 200 OK');
                expect(transaction.getResponse()).to.contain('Hello, world!');
            });
        });
    });

    // -------------------------------------------------------------------------

    context('Request with successful redirection', function () {
        beforeEach(function (done) {
            transaction = new Transaction({
                protocol: 'http:',
                hostname: 'localhost',
                port: port,
                method: 'GET',
                path: '/redirect/302/2'
            }, undefined, {
                followRedirects: true,
                redirectLimit: 10,
                redirectStatusCodes: [301, 302],
            });
            addListeners();
            transaction.send();
            setTimeout(done, 10);
        });
        describe('Events', function () {
            it('Emits "request" once', function () {
                expect(requestListener).calledOnce;
            });
            it('Emits "response" for each response', function () {
                expect(responseListener).calledThrice;
            });
            it('Emits "redirect" for each redirect', function () {
                expect(redirectListener).calledTwice;
            });
            it('Emits "end" once', function () {
                expect(endListener).calledOnce;
            });
            it('Does not emit "error"', function () {
                expect(errorListener).not.called;
            });
        });
    });
});
