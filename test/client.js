/* jshint node: true, mocha: true, expr: true */
"use strict";

var EventEmitter = require("events").EventEmitter,
    fs = require("fs"),
    http = require("http"),
    https = require("https"),
    path = require("path"),
    stream = require("stream"),
    url = require("url");

var chai = require("chai"),
    assert = chai.assert,
    sinon = require("sinon"),
    sinonChai = require("sinon-chai");

var Client = require("../lib/client").Client;

chai.should();
chai.use(sinonChai);

if (typeof String.prototype.startsWith != "function") {
  String.prototype.startsWith = function (str){
    return this.slice(0, str.length) == str;
  };
}

function stringToStream(string) {
    var s = new stream.Readable();
    s.push(string);
    s.push(null);
    return s;
}

// -----------------------------------------------------------------------------

describe("Client", function () {

    var httpServer,
        httpsServer,
        httpPort = 8760,
        httpsPort = 8761,
        getClient,
        defaultRequestOptions;

    before(function () {
        defaultRequestOptions = {
            method: "GET",
            protocol: "http",
            host: "localhost",
            path: "/",
            port: httpPort
        };

        // Create and start an HTTPS server.
        httpsServer = https.createServer({
            key: fs.readFileSync(path.resolve(__dirname, "https/key.pem")),
            cert: fs.readFileSync(path.resolve(__dirname, "https/cert.pem"))
        });
        httpsServer.on("request", function (request, response) {
            // GET /: Hello, world!
            response.statusCode = 200;
            response.setHeader("Content-Type", "text/plain");
            response.write("Hello, secret robot Internet!");
            response.end();
        });
        httpsServer.listen(httpsPort);

        // Create and start an HTTP server.
        httpServer = http.createServer();
        httpServer.on("request", function(request, response) {
            if (request.url === "/") {
                // Hello, world!
                response.statusCode = 200;
                response.setHeader("Content-Type", "text/plain");
                response.setHeader("X-custom-header", "custom-header-value");
                response.write("Hello, world!");
                response.end();
            } else if (request.url.startsWith("/redirect/")) {
                // Redirect the client from /redirect/{code}/{n} to
                // /redirect/{code}/{n-1}; If n = 1, redirects to /
                (function () {
                    var parts, code, n, location = "/";
                    parts = request.url.slice(1).split("/");
                    code = parts[1];
                    n = parseInt(parts[2], 10);
                    if (n > 1) {
                        location = "/redirect/" + code + "/" + (n - 1);
                    }
                    response.statusCode = code;
                    response.setHeader("Location", location);
                    response.end();
                })();
            } else if (request.url === "/method") {
                // Responds with the request's method.
                response.statusCode = 200;
                response.setHeader("Content-Type", "text/plain");
                response.write(request.method);
                response.end();
            } else if (request.url === "/body") {
                // Respond with the request's body.
                response.statusCode = 200;
                response.setHeader("Content-Type", "text/plain");
                request.pipe(response);
            } else {
                response.statusCode = 400;
                response.setHeader("Content-Type", "text/plain");
                response.write("Bad request");
                response.end();
            }
        });
        httpServer.listen(httpPort);
    });

    after(function () {
        // Unset the servers.
        httpsServer = undefined;
        httpServer = undefined;
    });

    getClient = function (options, body) {
        var client = new Client(), mergedOptions = {}, property;
        options = options || {};
        for (property in defaultRequestOptions) {
            mergedOptions[property] = defaultRequestOptions[property];
        }
        for (property in options) {
            mergedOptions[property] = options[property];
        }
        // Stub the parser to "parse" the request options we want.
        sinon.stub(client.parser, "parse", function (r, c, callback) {
            if (typeof body === "string") {
                body = stringToStream(body);
            }
            callback(mergedOptions, body);
        });
        return client;
    };

    // -------------------------------------------------------------------------

    describe("Construction", function () {
        it("Creates instance with default options", function () {
            var client = new Client();
            assert(client !== undefined);
        });
    });

    // -------------------------------------------------------------------------

    describe("Requesting", function () {

        it("Passes string or stream request to the parser", function () {
            var client = new Client(),
                spy = sinon.spy(client.parser, "parse"),
                request = "GET http://localhost/";
            client.request(request, {});
            spy.should.have.been.called;
        });

        it("Passes parsed request options to getRequest", function () {
            var client = getClient(),
                getRequest = sinon.spy(client, "getRequest");
                client.request("", {});
                client.getRequest.should.have.been.calledOnce;
                // TODO Account for removing protocol.
                //client.getRequest.should.have.been.calledWith(defaultRequestOptions);
        });

        it("Calls end() on request", function () {
            var client = getClient(),
                end,
                // Stub getRequest to return a spy client.
                getRequest = sinon.stub(client, "getRequest", function (options, callback) {
                    var request = http.request(options, callback);
                    end = sinon.spy(request, "end");
                    return request;
                });
            client.request("", {});
            end.should.have.been.called;
        });

        it("Emits response event", function (done) {
            var client = getClient();
            client.on("response", function (response) {
                done();
            });
            client.request(defaultRequestOptions);
        });

        describe("Request Method", function () {
            var methods = ["GET", "POST", "PUT", "DELETE", "OPTIONS"];
            methods.forEach(function (method) {
                it(method, function (done) {
                    var client = getClient({
                            method: method,
                            path: "/method"
                        });
                    client.on("response", function (response) {
                        var actualBody = "";
                        response.statusCode.should.equal(200);
                        response.setEncoding("utf8");
                        response.on("data", function (chunk) {
                            actualBody += chunk;
                        });
                        response.on("end", function () {
                            actualBody.should.equal(method);
                            done();
                        });
                    });
                    client.request(defaultRequestOptions);
                });
            });
        });

        it("Sends request body", function (done) {
            var client,
                expectedBody = "This is the message body";

            client = getClient({
                path: "/body",
                headers: {
                    "content-length": expectedBody.length
                }
            }, expectedBody);

            client.on("response", function (response) {
                var actualBody = "";
                response.statusCode.should.equal(200);
                response.setEncoding("utf8");
                response.on("data", function (chunk) {
                    actualBody += chunk;
                });
                response.on("end", function () {
                    actualBody.should.equal(expectedBody);
                    done();
                });
            });
            client.request(defaultRequestOptions);
        });
    });

    // -------------------------------------------------------------------------

    describe("Reading response", function () {

        it("Reads status code", function (done) {
            var client = getClient();
            client.on("response", function (response) {
                response.statusCode.should.equal(200);
                done();
            });
            client.request(defaultRequestOptions);
        });

        it("Reads headers", function (done) {
            var client = getClient();
            client.on("response", function (response) {
                response.headers["x-custom-header"].should.equal("custom-header-value");
                done();
            });
            client.request(defaultRequestOptions);
        });

        it("Response event receives response with message body", function (done) {
            var client = getClient(),
                expectedBody = "Hello, world!";
            client.on("response", function (response) {
                var actualBody = "";
                response.statusCode.should.equal(200);
                response.setEncoding("utf8");
                response.on("data", function (chunk) {
                    actualBody += chunk;
                });
                response.on("end", function () {
                    actualBody.should.equal(expectedBody);
                    done();
                });
            });
            client.request(defaultRequestOptions);
        });

    });

    // -------------------------------------------------------------------------

    describe("Protocol", function () {

        it("Makes HTTP requests", function (done) {
            var client = getClient(),
                expectedBody = "Hello, world!";
            client.on("response", function (response) {
                var actualBody = "";
                response.statusCode.should.equal(200);
                response.setEncoding("utf8");
                response.on("data", function (chunk) {
                    actualBody += chunk;
                });
                response.on("end", function () {
                    actualBody.should.equal(expectedBody);
                    done();
                });
            });
            client.request(defaultRequestOptions);
        });

        it("Makes HTTPS requests", function (done) {
            var client = getClient({
                    protocol: "https",
                    port: httpsPort,
                    rejectUnauthorized: false,
                    requestCert: true,
                }),
                expectedBody = "Hello, secret robot Internet!";
            client.on("response", function (response) {
                var actualBody = "";
                response.statusCode.should.equal(200);
                response.setEncoding("utf8");
                response.on("data", function (chunk) {
                    actualBody += chunk;
                });
                response.on("end", function () {
                    actualBody.should.equal(expectedBody);
                    done();
                });
            });
            client.request(defaultRequestOptions);
        });

    });

    // -------------------------------------------------------------------------

    describe("Redirects", function () {

        it("Follows 301 redirects by default", function (done) {
            var client = getClient({"path": "/redirect/301/3"}),
                redirects = 0,
                expected = 3;
            // Increment the redirect count when willRedrect is true.
            // Check the count and finish the test case when false.
            client.on("response", function (response, willRedirect) {
                if (willRedirect) {
                    ++redirects;
                } else {
                    redirects.should.equal(expected);
                    done();
                }
            });
            client.request(defaultRequestOptions);
        });

        it("Follows 302 redirects by default", function (done) {
            var client = getClient({"path": "/redirect/302/3"}),
                redirects = 0,
                expected = 3;
            // Increment the redirect count when willRedrect is true.
            // Check the count and finish the test case when false.
            client.on("response", function (response, willRedirect) {
                if (willRedirect) {
                    ++redirects;
                } else {
                    redirects.should.equal(expected);
                    done();
                }
            });
            client.request(defaultRequestOptions);
        });

        it("Does not follow redirects when followRedirects is false", function (done) {
            var client = getClient({"path": "/redirect/301/3"}),
                redirects = 0,
                expected = 0;
            // Increment the redirect count when willRedrect is true.
            // Check the count and finish the test case when false.
            client.on("response", function (response, willRedirect) {
                if (willRedirect) {
                    ++redirects;
                } else {
                    redirects.should.equal(expected);
                    done();
                }
            });
            client.followRedirects = false;
            client.request(defaultRequestOptions);
        });

        it("Does not follow redirects for disallowed status codes", function (done) {
            var client = getClient({"path": "/redirect/302/3"}),
                redirects = 0,
                expected = 0;
            // Increment the redirect count when willRedrect is true.
            // Check the count and finish the test case when false.
            client.on("response", function (response, willRedirect) {
                if (willRedirect) {
                    ++redirects;
                } else {
                    redirects.should.equal(expected);
                    done();
                }
            });
            client.followRedirects = true;
            client.redirectStatusCodes = [301];
            client.request(defaultRequestOptions);
        });

        it("Does not follow redirects after reaching redirect limit", function (done) {
            var client = getClient({"path": "/redirect/302/15"}),
                redirects = 0,
                expected = 10;
            // Increment the redirect count each time the client emits a
            // response and indicates it will redirect.
            client.on("response", function (response, willRedirect) {
                if (willRedirect) {
                    ++redirects;
                }
            });
            // Finish the test case then the client emits an error event with
            // the code that indicates it has reached the redirect limit.
            client.on("error", function (error) {
                redirects.should.equal(expected);
                error.should.equal(Client.error.REDIRECT_LIMIT_REACHED);
                done();
            });
            client.request(defaultRequestOptions);
        });

    });

    // TODO Parser needs to determine content-length
    // TODO Emits error when http.Client emits error
    // TODO Writes request body
    // TODO Redirect relative or absolute location

});
