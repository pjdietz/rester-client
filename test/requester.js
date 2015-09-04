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

describe("Requester", function () {

    describe("Construction", function () {
        it("Creates instance with default options", function () {
            var requester = new Requester();
            assert(requester !== undefined);
        });
    });

    describe("Requesting", function () {
        it("Passes request options to getRequest", function () {
            var requester,
                options;

            requester = new Requester();
            requester.getRequest = sinon.spy();

            options = {};
            requester.request(options);

            requester.getRequest.should.have.been.calledOnce;
            requester.getRequest.should.have.been.calledWith(options);
        });
    });

});
