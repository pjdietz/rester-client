'use strict';

const http = require('http');
const stream = require('stream');
const chai = require('chai');
const expect = chai.expect;
const sinon = require('sinon');
const sinonChai = require('sinon-chai');
const mockServers = require('../doubles/server');
const Transaction = require('../../src/transaction');
const RedirectError = require('../../src/errors').RedirectError;

const delay     = process.env.TEST_WAIT || 10;
const httpPort  = process.env.TEST_HTTP_PORT || 8761;
const httpsPort = process.env.TEST_HTTPS_PORT || 8762;

chai.use(sinonChai);

// -----------------------------------------------------------------------------

describe('Transaction', function () {

    let httpServer;
    let httpsServer;
    let transaction;

    before(function () {
        httpServer = mockServers.createHttpServer(httpPort);
        httpsServer = mockServers.createHttpsServer(httpsPort);
    });

    after(function () {
        httpServer = undefined;
        httpsServer = undefined;
    });

    afterEach(function () {
        transaction.removeAllListeners();
    });

    // -------------------------------------------------------------------------

    describe('Events', function () {

        let requestListener;
        let redirectListener;
        let responseListener;
        let endListener;
        let errorListener;

        beforeEach(function () {
            requestListener = sinon.spy();
            redirectListener = sinon.spy();
            responseListener = sinon.spy();
            endListener = sinon.spy();
            errorListener = sinon.spy();
        });

        function addListeners() {
            transaction.on('request', requestListener);
            transaction.on('redirect', redirectListener);
            transaction.on('response', responseListener);
            transaction.on('end', endListener);
            transaction.on('error', errorListener);
        }

        context('Request with no redirection', function () {
            beforeEach(function (done) {
                transaction = new Transaction({
                    protocol: 'http:',
                    hostname: 'localhost',
                    port: httpPort,
                    method: 'GET',
                    path: '/hello'
                });
                addListeners();
                transaction.send();
                setTimeout(done, delay)
            });
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
        context('Request with successful redirection', function () {
            beforeEach(function (done) {
                transaction = new Transaction({
                    protocol: 'http:',
                    hostname: 'localhost',
                    port: httpPort,
                    method: 'GET',
                    path: '/redirect/302/2'
                }, undefined, {
                    followRedirects: true,
                    redirectLimit: 10,
                    redirectStatusCodes: [301, 302]
                });
                addListeners();
                transaction.send();
                setTimeout(done, delay)
            });
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
        context('Request with successful redirection', function () {
            beforeEach(function (done) {
                transaction = new Transaction({
                    protocol: 'http:',
                    hostname: 'localhost',
                    port: httpPort,
                    method: 'GET',
                    path: '/redirect/302/2'
                }, undefined, {
                    followRedirects: true,
                    redirectLimit: 10,
                    redirectStatusCodes: [301, 302]
                });
                addListeners();
                transaction.send();
                setTimeout(done, delay)
            });
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
        context('Request with disallowed redirection (disabled)', function () {
            beforeEach(function (done) {
                transaction = new Transaction({
                    protocol: 'http:',
                    hostname: 'localhost',
                    port: httpPort,
                    method: 'GET',
                    path: '/redirect/302/5'
                }, undefined, {
                    followRedirects: false,
                    redirectLimit: 10,
                    redirectStatusCodes: [301]
                });
                addListeners();
                transaction.send();
                setTimeout(done, delay)
            });
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
        context('Request with disallowed redirection (by status code)', function () {
            beforeEach(function (done) {
                transaction = new Transaction({
                    protocol: 'http:',
                    hostname: 'localhost',
                    port: httpPort,
                    method: 'GET',
                    path: '/redirect/302/5'
                }, undefined, {
                    followRedirects: true,
                    redirectLimit: 10,
                    redirectStatusCodes: [301]
                });
                addListeners();
                transaction.send();
                setTimeout(done, delay)
            });
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
        context('Request exceeding redirect limit', function () {
            beforeEach(function (done) {
                transaction = new Transaction({
                    protocol: 'http:',
                    hostname: 'localhost',
                    port: httpPort,
                    method: 'GET',
                    path: '/redirect/302/2'
                }, undefined, {
                    followRedirects: true,
                    redirectLimit: 1,
                    redirectStatusCodes: [301, 302]
                });
                addListeners();
                transaction.send();
                setTimeout(done, delay)
            });
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
            it('Emits "error"', function () {
                expect(errorListener).calledWith(
                    sinon.match.instanceOf(RedirectError));
            });
        });
        context('Request with error', function () {
            beforeEach(function (done) {
                transaction = new Transaction({
                    protocol: 'http:',
                    hostname: 'localhost',
                    port: Number(httpPort) + 1,
                    method: 'GET',
                    path: '/'
                });
                addListeners();
                transaction.send();
                setTimeout(done, delay)
            });
            it('Emits "request" once', function () {
                expect(requestListener).calledOnce;
            });
            it('Does not emit "response"', function () {
                expect(responseListener).not.called;
            });
            it('Does not emit "redirect"', function () {
                expect(redirectListener).not.called;
            });
            it('Does not emits "end"', function () {
                expect(endListener).not.called;
            });
            it('Emits "error"', function () {
                expect(errorListener).called;
            });
        });
    });
    describe('Messages', function () {
        context('When a transaction completes', function () {
            beforeEach(function (done) {
                transaction = new Transaction({
                    protocol: 'http:',
                    hostname: 'localhost',
                    port: httpPort,
                    method: 'GET',
                    path: '/hello'
                }, undefined, {});
                transaction.on('end', done);
                transaction.send();
            });
            describe('Request returned by getRequest()', function () {
                it('Contains request line', function () {
                    expect(transaction.getRequest()).to.contain('GET /hello HTTP/1.1');
                });
                it('Contains headers', function () {
                    expect(transaction.getRequest()).to.contain('Host: localhost:' + httpPort);
                });
            });
            describe('Response returned by getResponse()', function () {
                it('Contains status line', function () {
                    expect(transaction.getResponse()).to.contain('HTTP/1.1 200 OK');
                });
                it('Contains headers', function () {
                    expect(transaction.getResponse()).to.contain('Content-Type: text/plain');
                });
                it('Contains Body', function () {
                    expect(transaction.getResponse()).to.contain('Hello, world!');
                });
            });
        });
        context('When redirects successfully', function () {
            beforeEach(function (done) {
                transaction = new Transaction({
                    protocol: 'http:',
                    hostname: 'localhost',
                    port: httpPort,
                    method: 'GET',
                    path: '/redirect/302/2'
                }, undefined, {
                    followRedirects: true,
                    redirectLimit: 10,
                    redirectStatusCodes: [301, 302]
                });
                transaction.on('end', done);
                transaction.send();
            });
            describe('Requests', function () {
                it('Contains a request for the initial request and each redirect', function () {
                    expect(transaction.requests.length).to.equal(3);
                });
                it('getRequest() returns the initial request', function () {
                    expect(transaction.getRequest()).to.contain('GET /redirect/302/2');
                });
                it('Requests array includes initial request followed by redirect requests', function () {
                    const expected = [
                        'GET /redirect/302/2',
                        'GET /redirect/302/1',
                        'GET /hello'
                    ];
                    for (let i = 0; i < expected.length; ++i) {
                        expect(transaction.requests[i]).to.contain(expected[i]);
                    }
                });
            });
            describe('Responses', function () {
                it('Contains a response for each response', function () {
                    expect(transaction.responses.length).to.equal(3);
                });
                it('getResponse() return the final response', function () {
                    expect(transaction.getResponse()).to.include('HTTP/1.1 200 OK');
                    expect(transaction.getResponse()).to.include('Hello, world!');
                });
                it('Responses array includes each response in order received', function () {
                    const expected = [
                        'HTTP/1.1 302 Found',
                        'HTTP/1.1 302 Found',
                        'HTTP/1.1 200 OK'
                    ];
                    for (let i = 0; i < expected.length; ++i) {
                        expect(transaction.responses[i]).to.contain(expected[i]);
                    }
                });
            });
        });
        context('When request contains a body', function () {
            const body = 'This is the request body';
            beforeEach(function (done) {
                transaction = new Transaction({
                    protocol: 'http:',
                    hostname: 'localhost',
                    port: httpPort,
                    method: 'POST',
                    path: '/echo'
                }, body, {});
                transaction.on('end', done);
                transaction.send();
            });
            it('Sends request body to server', function () {
                expect(transaction.getResponse()).to.contain(body);
            });
        });
    });
    describe('Protocol', function () {
        it('Makes HTTP requests', function (done) {
            transaction = new Transaction({
                    protocol: 'http:',
                    hostname: 'localhost',
                    port: httpPort,
                    method: 'GET',
                    path: '/hello'
                }, undefined, {});
            transaction.on('end', () => {
                expect(transaction.getResponse()).to.contain('Hello, world!');
                done();
            });
            transaction.send();
        });
        it('Makes HTTPS requests', function (done) {
            transaction = new Transaction({
                protocol: 'https:',
                hostname: 'localhost',
                port: httpsPort,
                method: 'GET',
                path: '/hello'
            }, undefined, {});
            transaction.on('end', () => {
                expect(transaction.getResponse()).to.contain('Hello, secret robot Internet!');
                done();
            });
            transaction.send();
        });
        it('Redirects from one protocol to another', function (done) {
            transaction = new Transaction({
                protocol: 'http:',
                hostname: 'localhost',
                port: httpPort,
                method: 'GET',
                path: '/redirect-to/' + encodeURIComponent('https://localhost:' + httpsPort)
            }, undefined, {
                followRedirects: true,
                redirectLimit: 10,
                redirectStatusCodes: [301, 302]
            });
            transaction.on('end', () => {
                expect(transaction.getResponse()).to.contain('Hello, secret robot Internet!');
                done();
            });
            transaction.send();
        });
    });
});
