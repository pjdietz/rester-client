/* jshint node: true, mocha: true, expr: true */
"use strict";

var chai = require("chai"),
    assert = chai.assert,
    sinon = require("sinon"),
    sinonChai = require("sinon-chai"),
    http = require("http"),
    EventEmitter = require("events").EventEmitter,
    Requester = require("../lib/requester").Requester,
    url = require("url"),
    port = 8765;

chai.should();
chai.use(sinonChai);

describe("Requester", function () {

    describe("Construction", function () {
        it("Creates instance with default options", function () {
            var requester = new Requester();
            assert(requester !== undefined);
        });
    });

    describe("Requesting", function () {

        var server, rqstOptions;

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

        it("Passes request options to getRequest", function () {
            var requester = new Requester(),
                getRequest = sinon.spy(requester, "getRequest");
            requester.request(rqstOptions);
            requester.getRequest.should.have.been.calledOnce;
            requester.getRequest.should.have.been.calledWith(rqstOptions);
        });

        it("Calls end() on request", function () {
            var requester = new Requester(),
                end;
            requester.getRequest = function () {
                var clientRequest = http.request.apply(requester, arguments);
                end = sinon.spy(clientRequest, "end");
                return clientRequest;
            };
            requester.request();
            end.should.have.been.called;
        });

        it("Emits response event", function (done) {
            var requester = new Requester();
            requester.on("response", function (response) {
                response.statusCode.should.equal(200);
                done();
            });
            requester.request(rqstOptions);
        });

    });

});
