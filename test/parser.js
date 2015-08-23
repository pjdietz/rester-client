var assert = require("chai").assert,
    should = require("chai").should(),
    EventEmitter = require("events").EventEmitter,
    Parser = require("../lib/parser").Parser;

describe("Parser", function () {

    describe("Construction", function () {
        it("Creates instance with default options", function () {
            var parser = new Parser();
            assert(parser !== undefined);
        });
    });

    describe("Request Line", function () {

        describe("Method", function () {

            var tests = [
                {
                    expected: "GET",
                    requestLine: "/cat/molly",
                    description: "Assumes GET for one-word line"
                },
                {
                    expected: "DELETE",
                    requestLine: "DELETE /delete/me",
                    description: "Reads method from two-word line"
                },
                {
                    expected: "POST",
                    requestLine: "POST /cat/molly HTTP/1.1",
                    description: "Reads method from three--or-more-word line"
                }
            ];

            tests.forEach(function (test) {
                it(test.description, function () {
                    var parser, stringParser, parsedRequestOptions;

                    stringParser = new EventEmitter();
                    stringParser.parse = function () {
                        this.emit("requestLine", test.requestLine);
                        this.emit("end");
                    };

                    parser = new Parser({
                        stringParser: stringParser
                    });
                    parser.parse("", null, function (rqst, conf) {
                        parsedRequestOptions = rqst;
                    });

                    parsedRequestOptions.method.should.equal(test.expected);
                });
            });

        });

        describe("Path", function () {

            var tests = [
                {
                    expected: "/cats/molly",
                    requestLine: "/cats/molly",
                    description: "Reads line as path for one-word line"
                },
                {
                    expected: "/delete/me",
                    requestLine: "DELETE /delete/me",
                    description: "Reads second word from two-word line"
                },
                {
                    expected: "/cats/molly",
                    requestLine: "GET http://localhost/cats/molly HTTP/1.1",
                    description: "Reads path from URI"
                }
            ];

            tests.forEach(function (test) {
                it(test.description, function () {

                    var parser, stringParser, parsedRequestOptions;

                    stringParser = new EventEmitter();
                    stringParser.parse = function () {
                        this.emit("requestLine", test.requestLine);
                        this.emit("end");
                    };

                    parser = new Parser({
                        stringParser: stringParser
                    });
                    parser.parse("", null, function (rqst, conf) {
                        parsedRequestOptions = rqst;
                    });

                    parsedRequestOptions.path.should.equal(test.expected);
                });
            });
        })

    });

});
