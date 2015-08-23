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
                },
                {
                    expected: "/",
                    requestLine: "GET http://localhost",
                    description: "Defaults to / when no path is present"
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
        });

        describe("Host and port", function () {

            var tests = [
                {
                    expectedHost: "localhost",
                    expectedHostname: "localhost",
                    expectedPost: undefined,
                    requestLine: "GET http://localhost/cats/molly HTTP/1.1",
                    description: "Reads host from URI"
                },
                {
                    expectedHost: "localhost:8080",
                    expectedHostname: "localhost",
                    expectedPost: "8080",
                    requestLine: "GET http://localhost:8080/cats/molly HTTP/1.1",
                    description: "Reads host with port from URI"
                },
                {
                    expectedHost: undefined,
                    expectedHostname: undefined,
                    expectedPost: undefined,
                    requestLine: "GET /cats/molly HTTP/1.1",
                    description: "Does not include host when not set in request line"
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

                    assert(parsedRequestOptions.host === test.expectedHost);
                    assert(parsedRequestOptions.hostname === test.expectedHostname);
                });
            });
        });

    });

});
