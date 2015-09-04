/* jshint node: true, mocha: true, expr: true */
"use strict";

var chai = require("chai"),
    assert = chai.assert,
    sinon = require("sinon"),
    sinonChai = require("sinon-chai"),
    EventEmitter = require("events").EventEmitter,
    Requester = require("../lib/requester").Requester,
    url = require("url");

chai.should();
chai.use(sinonChai);

function DummyClientRequest() {
    this.end = sinon.spy(function () {});
}

describe("Requester", function () {

    describe("Construction", function () {
        it("Creates instance with default options", function () {
            var requester = new Requester();
            assert(requester !== undefined);
        });
    });

    describe("Requesting", function () {
        it("Passes request options to getRequest", function () {
            var requester = new Requester(),
                options = {};

            requester.getRequest = sinon.spy(function () {
                return new DummyClientRequest();
            });
            requester.request(options);
            requester.getRequest.should.have.been.calledOnce;
            requester.getRequest.should.have.been.calledWith(options);
        });

        it("Emits response event", function () {
            var requester = new Requester(),
                expectedResponse = {},
                passedResponse;

            // Provide a dummy getRequest that immediatly calls the callback,
            // passing a response.
            requester.getRequest = function (options, callback) {
                if (callback) {
                    callback(expectedResponse);
                }
                return new DummyClientRequest();
            };
            requester.on("response", function (response) {
                passedResponse = response;
            });
            requester.request();
            passedResponse.should.equal(expectedResponse);
        });

        it("Calls end() on request", function () {
            var requester = new Requester(),
                clientRequest = new DummyClientRequest();

            requester.getRequest = function () {
                return clientRequest;
            };
            requester.request();
            clientRequest.end.should.have.been.called;
        });
    });

});
