"use strict";

var fs = require("fs"),
    http = require("http"),
    https = require("https"),
    path = require("path"),
    stream = require("stream");

var chai = require("chai"),
    assert = chai.assert,
    sinon = require("sinon"),
    sinonChai = require("sinon-chai");

var Client = require("../../src/client").Client;

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

    var getOptions,
        httpServer,
        httpsServer,
        httpPort = 8760,
        httpsPort = 8761,
        defaultOptions = {
            method: "GET",
            protocol: "http",
            host: "localhost",
            path: "/",
            port: httpPort
        };

    getOptions = function (options) {
        var properties, property, result = {}, i, u;
        // Copy defaultOptions.
        properties = Object.keys(defaultOptions);
        for (i = 0, u = properties.length; i < u; ++i) {
            property = properties[i];
            result[property] = defaultOptions[property];
        }
        // Override with options.
        if (options) {
            properties = Object.keys(options);
            for (i = 0, u = properties.length; i < u; ++i) {
                property = properties[i];
                result[property] = options[property];
            }
        }
        return result;
    };

    before(function () {

        // Create and start an HTTPS server.
        httpsServer = https.createServer({
            key: fs.readFileSync(path.resolve(__dirname, "../https/key.pem")),
            cert: fs.readFileSync(path.resolve(__dirname, "../https/cert.pem"))
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

    // -------------------------------------------------------------------------

    describe("Construction", function () {
        it("Creates instance with default options", function () {
            var client = new Client();
            assert(client !== undefined);
        });
    });

    describe("Making requests", function () {
        it("Calls end() on http(s).ClientRequest instance", function () {
            var client, createRequest, end;
            client = new Client(),
            // Stub getRequest to return a spy client.
            createRequest = sinon.stub(client, "_createRequest", function (options, callback) {
                var request = http.request(options, callback);
                end = sinon.spy(request, "end");
                return request;
            });
            client.request(getOptions());
            end.should.have.been.called;
        });
        describe("Sends requests method", function () {
            var methods = ["GET", "POST", "PUT", "DELETE", "OPTIONS"];
            methods.forEach(function (method) {
                it(method, function (done) {
                    var client = new Client(),
                        options = getOptions({
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
                    client.request(options);
                });
            });
        });
        it("Sends request body", function (done) {
            var client = new Client(),
                expectedBody = "This is the message body",
                options = getOptions({
                    path: "/body",
                    headers: {
                        "content-length": expectedBody.length
                    }
                });
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
            client.request(options, stringToStream(expectedBody));
        });
        it("Emits error when request has an error", function (done) {
            var client = new Client(),
                options = getOptions({
                    host: "badhost",
                    path: "/body"
            });
            client.on("error", function (error) {
                done();
            });
            client.request(options);
        });
    });

    // -------------------------------------------------------------------------

    describe("Reading response", function () {
        it("Emits response event", function (done) {
            var client = new Client();
            client.on("response", function (response) {
                done();
            });
            client.request(getOptions());
        });
    });

    // -------------------------------------------------------------------------

    describe("Protocol", function () {
        it("Makes HTTP requests", function (done) {
            var client = new Client(),
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
            client.request(getOptions());
        });
        it("Makes HTTPS requests", function (done) {
            var client = new Client(),
                options = getOptions({
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
            client.request(options);
        });
    });

    // -------------------------------------------------------------------------

    describe("Redirects", function () {
        it("Follows 301 redirects by default", function (done) {
            var client = new Client(),
                options = getOptions({"path": "/redirect/301/3"}),
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
            client.request(options);
        });
        it("Follows 302 redirects by default", function (done) {
            var client = new Client(),
                options = getOptions({"path": "/redirect/302/3"}),
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
            client.request(options);
        });
        it("Does not follow redirects when followRedirects is false", function (done) {
            var client = new Client(),
                options = getOptions({"path": "/redirect/302/3"}),
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
            client.request(options);
        });
        it("Does not follow redirects for disallowed status codes", function (done) {
            var client = new Client(),
                options = getOptions({"path": "/redirect/302/3"}),
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
            client.request(options);
        });
        it("Does not follow redirects after reaching redirect limit", function (done) {
            var client = new Client(),
                options = getOptions({"path": "/redirect/302/15"}),
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
                error.message.should.equal("Redirect limit reached");
                done();
            });
            client.request(options);
        });
    });

//     // TODO Read request body from file
//     // TODO Write response body to file
//     // TODO Emits error when http.Client emits error
//     // TODO Writes request body
//     // TODO Redirect relative or absolute location

});
