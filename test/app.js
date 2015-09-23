/* jshint node: true, mocha: true, -W030 */
"use strict";

var stream = require("stream");

var assert = require("chai").assert,
    expect = require("chai").expect,
    chai = require("chai"),
    sinon = require("sinon"),
    sinonChai = require("sinon-chai");

chai.should();
chai.use(sinonChai);

var App = require("../lib/app").App;

function stringToStream(string) {
    var s = new stream.Readable();
    s.push(string);
    s.push(null);
    return s;
}

function createApp(stdin, argv) {
    var app = new App();
    app._input = stringToStream(stdin || "");
    app._argv = argv || [];
    return app;
}

describe("App", function () {
    it("Creates instance with default options", function () {
        var app = new App();
        assert.isDefined(app);
    });

    describe("Initial input", function () {

        it("Parses request from first argument.", function (done) {
            var app,
                inputString = "GET /path HTTP/1.1\nHost: localhost",
                parse;
            app = createApp("", [inputString]);
            parse = sinon.spy(app._parser, "parse");
            app.on("end", function () {
                parse.should.have.been.calledWith(inputString);
                done();
            });
            app.run();
        });

        it("Parses request from stdin", function (done) {
            var app,
                inputString = "GET /path HTTP/1.1\nHost: localhost",
                parse;
            app = createApp(inputString, []);
            parse = sinon.spy(app._parser, "parse");
            app.on("end", function () {
                parse.should.have.been.calledWith(inputString);
                done();
            });
            app.run();
        });

        it("Stdin supercedes arguments", function (done) {
            var app,
                inputString1 = "GET /path HTTP/1.1\nHost: localhost",
                inputString2 = "GET /other/path HTTP/1.1\nHost: localhost",
                parse;
            app = createApp(inputString1, [inputString2]);
            parse = sinon.spy(app._parser, "parse");
            app.on("end", function () {
                parse.should.have.been.calledWith(inputString1);
                done();
            });
            app.run();
        });

        it("Emits error when no request is present", function (done) {
            var app;
            app = createApp();
            app.on("error", function () {
                done();
            });
            app.run();
        });
    });

});
