var assert = require("chai").assert,
    should = require("chai").should(),
    StringParser = require("../lib/stringParser").StringParser;
    request = [
        "",
        "",
        "POST / HTTP/1.1",
        "Host: localhost",
        "Content-type: application/json",
        "",
        "Here is the body"
    ].join("\n");

describe("String Parser", function () {

    it("Reads first non-empty line as reqest line", function () {

        var parser, requestLine;

        parser = new StringParser();
        parser.on("requestLine", function (line) {
            requestLine = line;
        });
        parser.parse(request);

        requestLine.should.equal("POST / HTTP/1.1");

    });

    it("Reads lines following request line as headers", function () {

        var parser, headers;

        headers = [];

        parser = new StringParser();
        parser.on("headerLine", function (line) {
            headers.push(line);
        });
        parser.parse(request);

        headers.length.should.equal(2);

    });

    it("Receives body as stream", function () {

        var parser, bodyStream, bodyString;

        parser = new StringParser();
        parser.on("body", function (stream) {
            bodyStream = stream;
        });
        parser.parse(request);

        assert(bodyStream !== undefined);

        bodyString = bodyStream.read().toString();
        bodyString.should.equal("Here is the body");
    });

});
