'use strict';

const chai = require('chai');
const expect = chai.expect;
const createServer = require('../doubles/server').createHttpServer;
const rester = require('../../src');

const port = process.env.TEST_HTTP_PORT || 8761;

describe('Client', () => {

    let server;

    before(() => {
        server = createServer(port);
    });

    after(() => {
        server.close();
    });

    describe('Messages', () => {
        context('When making a request', () => {
            let transaction;
            beforeEach((done) => {
                let client = new rester.Client({});
                transaction = client.request(`GET http://localhost:${port}/hello`);
                transaction.on('end', () => {
                    done();
                });
                transaction.send();
            });
            describe('Provides request as string', () => {
                it('With request line', () => {
                    expect(transaction.getRequest()).to.contain('GET /hello HTTP/1.1');
                });
                it('With host header', () => {
                    expect(transaction.getRequest()).to.contain(`Host: localhost:${port}`);
                });
            });
            describe('Provides response as string', () => {
                it('With status code line', () => {
                    expect(transaction.getResponse()).to.match(/^HTTP\/1\.1 200 OK/);
                });
                it('With headers', () => {
                    expect(transaction.getResponse()).to.match(/Content-type: text\/plain/i);
                });
                it('With response body', () => {
                    expect(transaction.getResponse()).to.match(/Hello, world!$/);
                });
            });
            context('When request contains a message body', () => {
                const body = 'Message payload';
                let transaction;
                beforeEach((done) => {
                    const request = `
                        POST http://localhost:${port}/echo
                        Content-type: text/plain

                        ${body}`;
                    let client = new rester.Client({});
                    transaction = client.request(request);
                    transaction.on('end', () => {
                        done();
                    });
                    transaction.send();
                });
                it('Request string representation contains body', () => {
                    expect(transaction.getRequest()).to.contain(body);
                });
                it('Submits request body to server', () => {
                    expect(transaction.getResponse()).to.contain(body);
                });
            });
        });
    });
});
