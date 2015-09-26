/* jshint node: true, mocha: true, -W030 */
"use strict";

var fs = require("fs"),
    http = require("http"),
    os = require("os"),
    stream = require("stream");

var assert = require("chai").assert,
    expect = require("chai").expect,
    chai = require("chai"),
    sinon = require("sinon"),
    sinonChai = require("sinon-chai"),
    tmp = require("tmp");

chai.should();
chai.use(sinonChai);

var App = require("../lib/app").App;

// -----------------------------------------------------------------------------

describe("App", function () {

    var port = 8764,
        server,
        passthrough,
        requestString = [
            "GET http://localhost:8764/"
        ].join("\n");

    function createApp(argv) {
        passthrough = new stream.PassThrough();
        return new App(argv, passthrough);
    }

    before(function () {
        // Create and start an HTTPS server.
        server = http.createServer();
        server.on("request", function (request, response) {
            if (request.url === "/") {
                // GET /: Hello, world!
                response.statusCode = 200;
                response.setHeader("Content-Type", "text/plain");
                response.setHeader("X-custom-header", "custom-header-value");
                response.write("Hello, world!");
                response.end();
            } else if (request.url === "/text") {
                // GET /: Lines of text
                response.statusCode = 200;
                response.setHeader("Content-Type", "text/plain");
                response.write("Cat: Molly\n");
                response.write("Cat: Oscar\n");
                response.write("Cat: Rufus\n");
                response.write("Dog: Bear\n");
                response.end();
            } else {
                response.statusCode = 404;
                response.setHeader("Content-Type", "text/plain");
                response.write("Not found");
                response.end();
            }
        });
        server.listen(port);
    });

    after(function () {
        server = null;
    });

    it("Creates instance with default options", function () {
        var app = new App();
        assert.isDefined(app);
    });

    describe("Reading request", function () {

        it("Parses string request", function (done) {
            var app,
                parse;
            app = createApp([requestString]);
            parse = sinon.spy(app._parser, "parse");
            app.on("end", function () {
                parse.should.have.been.calledWith(requestString);
                done();
            });
            app.run();
        });

        it("Parses file request", function (done) {
            var app,
                f,
                parse;
            f = tmp.fileSync();
            app = createApp([f.name]);
            parse = sinon.spy(app._parser, "parse");
            fs.writeFileSync(f.name, requestString);
            app.on("end", function () {
                parse.should.have.been.calledWith(requestString);
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

    describe("Making Request", function () {

        it("Calls client request", function (done) {
            var app,
                request;
            app = createApp([requestString]);
            request = sinon.spy(app._client, "request");
            app.on("end", function () {
                request.should.have.been.called;
                done();
            });
            app.run();

        });

        it("Outputs response", function (done) {
            var app,
                request;
            app = createApp([requestString]);
            app.on("end", function () {
                var response = "";
                passthrough.on("data", function (chunk) {
                    response += chunk;
                });
                passthrough.on("end", function () {
                    expect(response).to.contain("Hello, world!");
                    done();
                });
            });
            app.run();
        });

        it("Outputs response without status and headers", function (done) {
            var app,
                request;
            app = createApp([requestString, "-H"]);
            app.on("end", function () {
                var response = "";
                passthrough.on("data", function (chunk) {
                    response += chunk;
                });
                passthrough.on("end", function () {
                    expect(response).to.not.contain("HTTP/1.1 200 OK");
                    expect(response).to.not.contain("X-custom-header: custom-header-value");
                    expect(response).to.contain("Hello, world!");
                    done();
                });
            });
            app.run();
        });
        it("Outputs response with status and headers", function (done) {
            var app,
                request;
            app = createApp([requestString, "-h"]);
            app.on("end", function () {
                var response = "";
                passthrough.on("data", function (chunk) {
                    response += chunk;
                });
                passthrough.on("end", function () {
                    expect(response).to.contain("HTTP/1.1 200 OK");
                    expect(response).to.contain("X-custom-header: custom-header-value");
                    expect(response).to.contain("Hello, world!");
                    done();
                });
            });
            app.run();
        });
        it("Outputs final response without redirects", function () {});
        it("Outputs final response with redirects", function () {});

        it("Pipes response to one command", function (done) {
            var app,
                request;
            app = createApp([requestString + "text", "--pipe=grep Cat"]);
            app.on("end", function () {
                var response = "";
                passthrough.on("data", function (chunk) {
                    response += chunk;
                });
                passthrough.on("end", function () {
                    expect(response).to.contain("Cat: Molly");
                    expect(response).to.not.contain("Dog: Bear");
                    done();
                });
            });
            app.run();
        });

        it("Pipes response to multiple commands", function (done) {
            var app,
                request;
            // Grep the response for lines containing "Cat", then pipe that to
            // wc to get the number of lines. The result should be 3.
            app = createApp([requestString + "text", '--pipe=grep -e "Cat" | wc -l']);
            app.on("end", function () {
                var response = "";
                passthrough.on("data", function (chunk) {
                    response += chunk;
                });
                passthrough.on("end", function () {
                    expect(response).to.contain("3");
                    expect(response).to.not.contain("Cat: Molly");
                    expect(response).to.not.contain("Dog: Bear");
                    done();
                });
            });
            app.run();
        });
    });
});
