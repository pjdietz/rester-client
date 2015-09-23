/* jshint node: true, mocha: true, -W030 */
"use strict";

var fs = require("fs"),
    http = require("http"),
    os = require("os");

var assert = require("chai").assert,
    expect = require("chai").expect,
    chai = require("chai"),
    sinon = require("sinon"),
    sinonChai = require("sinon-chai"),
    tmp = require("tmp");

chai.should();
chai.use(sinonChai);

var App = require("../lib/app").App;

function createApp(argv) {
    var app = new App();
    app._argv = argv || [];
    return app;
}

describe("App", function () {

    it("Creates instance with default options", function () {
        var app = new App();
        assert.isDefined(app);
    });

    describe("Reading request", function () {

        it("Parses string request", function (done) {
            var app,
                inputString = "GET /path HTTP/1.1\nHost: localhost",
                parse;
            app = createApp([inputString]);
            parse = sinon.spy(app._parser, "parse");
            app.on("end", function () {
                parse.should.have.been.calledWith(inputString);
                done();
            });
            app.run();
        });

        it("Parses file request", function (done) {
            var app,
                f,
                inputString = "GET /path HTTP/1.1\nHost: localhost",
                parse;
            f = tmp.fileSync();
            app = createApp([f.name]);
            parse = sinon.spy(app._parser, "parse");
            fs.writeFileSync(f.name, inputString);
            app.on("end", function () {
                parse.should.have.been.calledWith(inputString);
                done();
            });
            app.run();
        });

        it("Emits error when request is not a file", function (done) {
            var app;
            app = createApp([os.tmpdir()]);
            app.on("error", function () {
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

    describe("Reading Options", function () {});

    describe("Making Request", function () {});

});
