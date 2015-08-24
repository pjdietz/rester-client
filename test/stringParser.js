/* jshint node: true */
/* globals describe, it */
"use strict";

var assert = require("chai").assert,
    should = require("chai").should(),
    StringParser = require("../lib/stringParser").StringParser,
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
        parser.on("header", function (line) {
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

    it("Receives end event", function () {
        var parser, ended;
        ended = false;
        parser = new StringParser();
        parser.on("end", function () {
            ended = true;
        });
        parser.parse(request);
        assert(ended);
    });

    it("Does not receieve body for request with no body", function () {
        var parser, request, body, ended;
        body = false;
        ended = false;
        request = [
            "GET / HTTP/1.1",
            "Host: localhost",
            "Content-type: application/json",
        ].join("\n");
        parser = new StringParser();
        parser.on("body", function () {
            body = true;
        });
        parser.on("end", function () {
            ended = true;
        });
        parser.parse(request);
        assert(ended);
        assert(!body);
    });

});
