/* jshint node: true, mocha: true */
"use strict";

var assert = require("chai").assert,
    should = require("chai").should(),
    EventEmitter = require("events").EventEmitter,
    Requester = require("../lib/requester").Requester,
    url = require("url");

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
                passedRequestOptions,
                options;

            requester = new Requester();
            requester.getRequest = function (opts) {
                passedRequestOptions = opts;
            };

            options = {};
            requester.request(options);

            passedRequestOptions.should.equal(options);
        });
    });

});
