/* jshint node: true, mocha: true */
"use strict";

var assert = require("chai").assert,
    expect = require("chai").expect;

var Parser = require("../lib/parser").Parser;

describe("Parser", function () {

    describe("Construction", function () {
        it("Creates instance with default options", function () {
            var parser = new Parser();
            assert(parser !== undefined);
        });
    });

    describe("Request Line", function () {

        var requests = [
            {
                description: "No method, full URI",
                request: "http://localhost/dogs",
                method: "GET",
                host: "localhost",
                path: "/dogs"
            },
            {
                description: "Method, path only",
                request: "POST /cats",
                method: "POST",
                host: "localhost",
                path: "/cats"
            },
            {
                description: "Blank lines at start",
                request: ["", "   ", "PUT /hamsters"].join("\n"),
                method: "PUT",
                host: "localhost",
                path: "/hamsters"
            }
        ];

        describe("Parses method", function () {
            requests.forEach(function (test) {
                it(test.description, function (done) {
                    var parser = new Parser();
                    parser.parse(test.request, function (error, options, body) {
                        expect(options.method).to.equal(test.method);
                        done();
                    });
                });
            });
        });

    });

});
