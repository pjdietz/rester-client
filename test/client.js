/* jshint node: true, mocha: true, expr: true */
"use strict";

var chai = require("chai"),
    assert = chai.assert,
    sinon = require("sinon"),
    sinonChai = require("sinon-chai"),
    http = require("http"),
    EventEmitter = require("events").EventEmitter,
    Client = require("../lib/client").Client,
    url = require("url"),
    port = 8760;

chai.should();
chai.use(sinonChai);

describe("Client", function () {

    var server,
        getClient,
        rqstOptions;

    before(function () {
        rqstOptions = {
            method: "GET",
            path: "/",
            host: "localhost",
            port: port
        };
        server = http.createServer(function(request, response) {
          response.statusCode = 200;
          response.setHeader("Content-Type", "text/plain");
          response.setHeader("X-custom-header", "custom-header-value");
          response.write("Hello, world!");
          response.end();
        }).listen(port);
    });

    after(function () {
        server = undefined;
    });

    getClient = function () {
        var client = new Client();
        // Stub the parser to "parse" the request options we want.
        sinon.stub(client.parser, "parse", function (r, c, callback) {
            callback(rqstOptions);
        });
        return client;
    };

    describe("Construction", function () {
        it("Creates instance with default options", function () {
            var client = new Client();
            assert(client !== undefined);
        });
    });

    describe("Requesting", function () {

        it("Passes string or stream request to the parser", function () {
            var client = new Client(),
                spy = sinon.spy(client.parser, "parse"),
                request = "GET http://localhost/";
            client.request(request, {});
            spy.should.have.been.called;
        });

        it("Passes parsed request options to getRequest", function () {
            var client = getClient(),
                getRequest = sinon.spy(client, "getRequest");
                client.request("", {});
                client.getRequest.should.have.been.calledOnce;
                client.getRequest.should.have.been.calledWith(rqstOptions);
        });

        it("Calls end() on request", function () {
            var client = getClient(),
                end,
                // Stub getRequest to return a spy client.
                getRequest = sinon.stub(client, "getRequest", function (options, callback) {
                    var request = http.request(options, callback);
                    end = sinon.spy(request, "end");
                    return request;
                });
            client.request("", {});
            end.should.have.been.called;
        });

        it("Emits response event", function (done) {
            var client = getClient();
            client.on("response", function (response) {
                done();
            });
            client.request(rqstOptions);
        });

    });

    describe("Reading response", function () {

        it("Reads status code", function (done) {
            var client = getClient();
            client.on("response", function (response) {
                response.statusCode.should.equal(200);
                done();
            });
            client.request(rqstOptions);
        });

        it("Reads headers", function (done) {
            var client = getClient();
            client.on("response", function (response) {
                response.headers["x-custom-header"].should.equal("custom-header-value");
                done();
            });
            client.request(rqstOptions);
        });

        it("Response event receives response with message body", function (done) {
            var client = getClient(),
                expectedBody = "Hello, world!";
            client.on("response", function (response) {
                var actualBody = "";
                response.statusCode.should.equal(200);
                response.setEncoding("utf8");
                response.on("data", function (chunk) {
                    actualBody += chunk;
                });
                response.on("end", function () {
                    actualBody.should.equal(expectedBody);
                    done();
                });
            });
            client.request(rqstOptions);
        });

    });

});
