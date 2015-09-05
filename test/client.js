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

    describe("Construction", function () {
        it("Creates instance with default options", function () {
            var client = new Client();
            assert(client !== undefined);
        });
    });

    describe("Requesting", function () {

        var server,
            rqstOptions,
            getClient;

        getClient = function () {
            var client = new Client();
            // Stub the parser to "parse" the request options we want.
            sinon.stub(client.parser, "parse", function (r, c, callback) {
                callback(rqstOptions);
            });
            return client;
        };

        before(function () {
            rqstOptions = {
                method: "GET",
                path: "/",
                host: "localhost",
                port: port
            };
            server = http.createServer(function(request, response) {
              response.writeHead(200, {"Content-Type": "text/plain"});
              response.write("Hello World");
              response.end();
            }).listen(port);
        });

        after(function () {
            server = undefined;
        });

        it("Passes the request to the parser", function () {
            var client = new Client(),
                spy = sinon.spy(client.parser, "parse"),
                request = "GET http://localhost/";
            client.request(request, {});
            spy.should.have.been.called;
        });

        it("Passes request options to getRequest", function () {
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
                response.statusCode.should.equal(200);
                done();
            });
            client.request(rqstOptions);
        });

    });

});
