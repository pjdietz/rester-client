/* jshint node: true, mocha: true, -W030 */
"use strict";

var stream = require("stream");

var assert = require("chai").assert,
    expect = require("chai").expect,
    chai = require("chai"),
    sinon = require("sinon"),
    sinonChai = require("sinon-chai");

var App = require("../lib/app").App;

function stringToStream(string) {
    var s = new stream.Readable();
    s.push(string);
    s.push(null);
    return s;
}

describe("App", function () {
    it("Creates instance", function () {
        var app = new App();
        assert.isDefined(app);
    });

    describe("Initial input", function () {

        it("Parses request from stdin", function (done) {
            var app,
                inputString = "GET /path HTTP/1.1\nHost: localhost",
                parse;
            app = new App();
            app._input = stringToStream(inputString);
            parse = sinon.spy(app._parser, "parse");
            app.on("end", function () {
                assert(parse.calledWith(inputString));
                done();
            });
            app.run();
        });

    });

});
