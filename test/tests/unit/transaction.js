'use strict';

var http = require('http');

var chai = require('chai'),
    expect = chai.expect,
    sinon = require('sinon'),
    sinonChai = require('sinon-chai');

var createServer = require('../../doubles/server').createServer;

var Transaction = require('../../../src/transaction'),
    RedirectError = require('../../../src/errors').RedirectError;

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
        server = createServer(port);
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
            it('Does not emits "redirect"', function () {
                expect(redirectListener).not.called;
            });
            it('Emits "end" once', function () {
                expect(endListener).calledOnce;
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

    // -------------------------------------------------------------------------

    context('Request with disallowed redirection (disabled)', function () {
        beforeEach(function (done) {
            transaction = new Transaction({
                protocol: 'http:',
                hostname: 'localhost',
                port: port,
                method: 'GET',
                path: '/redirect/302/5'
            }, undefined, {
                followRedirects: false,
                redirectLimit: 10,
                redirectStatusCodes: [301]
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
            it('Does not emits "redirect"', function () {
                expect(redirectListener).not.called;
            });
            it('Emits "end" once', function () {
                expect(endListener).calledOnce;
            });
            it('Does not emit "error"', function () {
                expect(errorListener).not.called;
            });
        });
    });

    // -------------------------------------------------------------------------

    context('Request with disallowed redirection (by status code)', function () {
        beforeEach(function (done) {
            transaction = new Transaction({
                protocol: 'http:',
                hostname: 'localhost',
                port: port,
                method: 'GET',
                path: '/redirect/302/5'
            }, undefined, {
                followRedirects: true,
                redirectLimit: 10,
                redirectStatusCodes: [301]
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
            it('Does not emits "redirect"', function () {
                expect(redirectListener).not.called;
            });
            it('Emits "end" once', function () {
                expect(endListener).calledOnce;
            });
            it('Does not emit "error"', function () {
                expect(errorListener).not.called;
            });
        });
    });

    // -------------------------------------------------------------------------

    context('Request exceeding redirect limit', function () {
        beforeEach(function (done) {
            transaction = new Transaction({
                protocol: 'http:',
                hostname: 'localhost',
                port: port,
                method: 'GET',
                path: '/redirect/302/2'
            }, undefined, {
                followRedirects: true,
                redirectLimit: 1,
                redirectStatusCodes: [301, 302]
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
                expect(responseListener).calledTwice;
            });
            it('Emits "redirect" once for each allowed redirect', function () {
                expect(redirectListener).calledOnce;
            });
            it('Does not emits "end"', function () {
                expect(endListener).not.called;
            });
            it('Emit "error"', function () {
                expect(errorListener).calledWith(
                    sinon.match.instanceOf(RedirectError));
            });
        });
    });
});
