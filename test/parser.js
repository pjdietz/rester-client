/* jshint node: true, mocha: true, -W030 */
"use strict";

var url = require("url");

var assert = require("chai").assert,
    expect = require("chai").expect;

var Parser = require("../lib/parser").Parser;

// Does nothing, but provides coverage filtered for in.
Object.prototype.notOwn = function () {};

describe("Parser", function () {

    describe("Construction", function () {
        it("Creates instance with default options", function () {
            var parser = new Parser();
            assert(parser !== undefined);
        });
    });

    describe("Request line", function () {

        var requests = [
            {
                description: "No method, URI",
                request: "http://localhost/dogs",
                method: "GET",
                protocol: "http:",
                auth: null,
                host: "localhost",
                hostname: "localhost",
                port: null,
                path: "/dogs"
            },
            {
                description: "No method, URI with port",
                request: "http://localhost:8080/dogs?name=bear",
                method: "GET",
                protocol: "http:",
                auth: null,
                host: "localhost:8080",
                hostname: "localhost",
                port: "8080",
                path: "/dogs?name=bear"
            },
            {
                description: "Method, path only",
                request: "POST /cats",
                method: "POST",
                protocol: null,
                auth: null,
                host: null,
                hostname: null,
                port: null,
                path: "/cats"
            },
            {
                description: "Blank lines at start",
                request: ["", "   ", "PUT /hamsters"].join("\n"),
                method: "PUT",
                protocol: null,
                auth: null,
                host: null,
                hostname: null,
                port: null,
                path: "/hamsters"
            },
            {
                description: "Method, path, and version",
                request: "OPTIONS /guinea-pigs HTTP/1.1",
                method: "OPTIONS",
                protocol: null,
                auth: null,
                host: null,
                hostname: null,
                port: null,
                path: "/guinea-pigs"
            },
            {
                description: "Authority",
                request: "DELETE https://fry:secret@mydomain.com/cats",
                method: "DELETE",
                protocol: "https:",
                auth: "fry:secret",
                host: "mydomain.com",
                hostname: "mydomain.com",
                port: null,
                path: "/cats"
            },
        ];

        describe("Parses method", function () {
            requests.forEach(function (test) {
                it(test.description, function (done) {
                    var parser = new Parser();
                    parser.parse(test.request, function (error, options, body) {
                        expect(options.method).to.equal(test.method);
                        done();
                    });
                });
            });
        });

        describe("Parses protocol", function () {
            requests.forEach(function (test) {
                it(test.description, function (done) {
                    var parser = new Parser();
                    parser.parse(test.request, function (error, options, body) {
                        expect(options.protocol).to.equal(test.protocol);
                        done();
                    });
                });
            });
        });

        describe("Parses auth", function () {
            requests.forEach(function (test) {
                it(test.description, function (done) {
                    var parser = new Parser();
                    parser.parse(test.request, function (error, options, body) {
                        expect(options.auth).to.equal(test.auth);
                        done();
                    });
                });
            });
        });

        describe("Parses host", function () {
            requests.forEach(function (test) {
                it(test.description, function (done) {
                    var parser = new Parser();
                    parser.parse(test.request, function (error, options, body) {
                        expect(options.host).to.equal(test.host);
                        done();
                    });
                });
            });
        });

        describe("Parses hostname", function () {
            requests.forEach(function (test) {
                it(test.description, function (done) {
                    var parser = new Parser();
                    parser.parse(test.request, function (error, options, body) {
                        expect(options.hostname).to.equal(test.hostname);
                        done();
                    });
                });
            });
        });

        describe("Parses port", function () {
            requests.forEach(function (test) {
                it(test.description, function (done) {
                    var parser = new Parser();
                    parser.parse(test.request, function (error, options, body) {
                        expect(options.port).to.equal(test.port);
                        done();
                    });
                });
            });
        });

        describe("Parses path", function () {
            requests.forEach(function (test) {
                it(test.description, function (done) {
                    var parser = new Parser();
                    parser.parse(test.request, function (error, options, body) {
                        expect(options.path).to.equal(test.path);
                        done();
                    });
                });
            });
        });

    }); // Request line

    describe("Headers, query, and options", function () {

        var request = [
            "POST http://mydomain.com/cats?cat=molly&dog=bear",
            "?cat=oscar",
            " & hamster : Fizzgig",
            "?guineaPigs=Clyde and Claude",
            "&query",
            "Host: localhost",
            "Cache-control: no-cache",
            "Content-type: application/json",
            "# This is a comment",
            "@flag",
            "@followRedirects: true",
            "@redirectStatusCodes: [301, 302]",
            "@redirectLimit: 5",
            "@stringOption: \"stringValue\"",
            "@unquotedStringOption: stringValue=2",
            "",
            "{\"name\": \"molly\"}",
            ""
        ].join("\n");

        it("Parses headers", function (done) {
            var parser = new Parser();
            parser.parse(request, function (error, options, body) {
                var header, headers = {
                    "Host": "localhost",
                    "Cache-control": "no-cache",
                    "Content-type": "application/json",
                };
                for (header in headers) {
                    expect(options.headers[header]).to.equal(headers[header]);
                }
                done();
            });
        });

        describe("Parses query", function () {

            it("Does not replace parameters in request line not overriden later", function (done) {
                var parser = new Parser();
                parser.parse(request, function (error, options, body) {
                    var query = url.parse(options.path, true).query;
                    expect(query.dog).to.equal("bear");
                    done();
                });
            });

            it("Replaces parameters with overrides", function (done) {
                var parser = new Parser();
                parser.parse(request, function (error, options, body) {
                    var query = url.parse(options.path, true).query;
                    expect(query.cat).to.equal("oscar");
                    done();
                });
            });

            it("Parses parameters starting with ?", function (done) {
                var parser = new Parser();
                parser.parse(request, function (error, options, body) {
                    var query = url.parse(options.path, true).query;
                    expect(query.cat).to.equal("oscar");
                    done();
                });
            });

            it("Parses parameters starting with &", function (done) {
                var parser = new Parser();
                parser.parse(request, function (error, options, body) {
                    var query = url.parse(options.path, true).query;
                    expect(query.hamster).to.equal("Fizzgig");
                    done();
                });
            });

            it("Parses parameters separated with =", function (done) {
                var parser = new Parser();
                parser.parse(request, function (error, options, body) {
                    var query = url.parse(options.path, true).query;
                    expect(query.cat).to.equal("oscar");
                    done();
                });
            });

            it("Parses parameters separated with :", function (done) {
                var parser = new Parser();
                parser.parse(request, function (error, options, body) {
                    var query = url.parse(options.path, true).query;
                    expect(query.hamster).to.equal("Fizzgig");
                    done();
                });
            });

            it("Parses parameters with no values", function (done) {
                var parser = new Parser();
                parser.parse(request, function (error, options, body) {
                    var query = url.parse(options.path, true).query;
                    expect(query.query).to.equal("");
                    done();
                });
            });

        }); // Query

        describe("Parses options", function () {

            it("Parses flag options", function (done) {
                var parser = new Parser();
                parser.parse(request, function (error, options, body) {
                    expect(options.flag).to.be.a("boolean");
                    expect(options.flag).to.equal(true);
                    done();
                });
            });

            it("Parses boolean options", function (done) {
                var parser = new Parser();
                parser.parse(request, function (error, options, body) {
                    expect(options.followRedirects).to.be.a("boolean");
                    expect(options.followRedirects).to.equal(true);
                    done();
                });
            });

            it("Parses number options", function (done) {
                var parser = new Parser();
                parser.parse(request, function (error, options, body) {
                    expect(options.redirectLimit).to.be.a("number");
                    expect(options.redirectLimit).to.equal(5);
                    done();
                });
            });

            it("Parses array options", function (done) {
                var parser = new Parser();
                parser.parse(request, function (error, options, body) {
                    expect(options.redirectStatusCodes).to.be.a("array");
                    expect(options.redirectStatusCodes).to.have.length(2);
                    expect(options.redirectStatusCodes).to.include(301);
                    expect(options.redirectStatusCodes).to.include(302);
                    done();
                });
            });

            it("Parses string options with quotes", function (done) {
                var parser = new Parser();
                parser.parse(request, function (error, options, body) {
                    expect(options.stringOption).to.be.a("string");
                    expect(options.stringOption).to.equal("stringValue");
                    done();
                });
            });

            it("Parses string options without quotes", function (done) {
                var parser = new Parser();
                parser.parse(request, function (error, options, body) {
                    expect(options.unquotedStringOption).to.be.a("string");
                    expect(options.unquotedStringOption).to.equal("stringValue=2");
                    done();
                });
            });

        }); // Options

    });

    describe("Body", function () {
        describe("String body", function () {

            var request = [
                "POST http://mydomain.com/cats",
                "Host: localhost",
                "Content-type: application/json",
                "",
                '{"name": "molly"}'
            ].join("\n");

            it("Provides body as stream", function (done) {
                var parser = new Parser();
                parser.parse(request, function (error, options, body) {
                    var bodyString = body.read().toString();
                    expect(bodyString).to.equal('{"name": "molly"}');
                    done();
                });
            });
            it("Adds content-length header", function (done) {
                var parser = new Parser();
                parser.parse(request, function (error, options, body) {
                    expect(options.headers["content-length"]).to.equal("17");
                    done();
                });
            });
        });

        describe("No string body", function () {

            var request = [
                "GET http://mydomain.com/cats",
                "Host: localhost",
                "Content-type: application/json",
                "",
                "",
                ""
            ].join("\n");

            it("Body is undefined when no body is present.", function (done) {
                var parser = new Parser();
                parser.parse(request, function (error, options, body) {
                    expect(body).to.be.undefined;
                    done();
                });
            });
            it("Body is undefined when no body is present.", function (done) {
                var parser = new Parser();
                parser.parse(request, function (error, options, body) {
                    var countHeaders = 0, header;
                    for (header in options.headers) {
                        if (options.headers.hasOwnProperty(header) &&
                                (header.toLowerCase() === "content-length")) {
                            ++countHeaders;
                        }
                    }
                    expect(countHeaders).to.equal(0);
                    done();
                });
            });
        });

        describe("Forms", function () {

            var request = [
                "POST http://mydomain.com/cats",
                "Host: localhost",
                "@form",
                "",
                "cat=molly",
                " dog: bear",
                "guineaPigs: Clyde and Claude",
                "# comment: Ignore this line.",
                '    quoted = """This is the value""" This is ignored.',
                'comments: """Dear Life Cereal, Where do you get off?',
                'Part of a balanced breakfast and delicious? Who do you think',
                'you are? By now, you may have guessed I\'m speaking',
                'ironically and have nothing but good things to say about what',
                'you do. Life Cereal, do not change a thing. Signed: Peter',
                'Griffin. Dictated but not read."""',
            ].join("\n");

            it("Adds Content-type header when @form option is true", function (done) {
                var parser = new Parser();
                parser.parse(request, function (error, options, body) {
                    expect(options.headers["content-type"].toLowerCase()).to.equal("application/x-www-form-urlencoded");
                    done();
                });
            });

            describe("Encodes form fields when @form option is true", function () {
                it("Uses = separator", function (done) {
                    var parser = new Parser();
                    parser.parse(request, function (error, options, body) {
                        var bodyString = body.read().toString();
                        expect(bodyString).to.contain("cat=molly");
                        done();
                    });
                });
                it("Uses : separator", function (done) {
                    var parser = new Parser();
                    parser.parse(request, function (error, options, body) {
                        var bodyString = body.read().toString();
                        expect(bodyString).to.contain("dog=bear");
                        done();
                    });
                });
                it("Skips lines beginning with #", function (done) {
                    var parser = new Parser();
                    parser.parse(request, function (error, options, body) {
                        var bodyString = body.read().toString();
                        expect(bodyString).to.not.contain("Ignore");
                        done();
                    });
                });
                it("Percent encodes values", function (done) {
                    var parser = new Parser();
                    parser.parse(request, function (error, options, body) {
                        var bodyString = body.read().toString();
                        expect(bodyString).to.contain("guineaPigs=Clyde%20and%20Claude");
                        done();
                    });
                });
                it("Parses values in tripple quotes.", function (done) {
                    var parser = new Parser();
                    parser.parse(request, function (error, options, body) {
                        var bodyString = body.read().toString();
                        expect(bodyString).to.contain("quoted=This%20is%20the%20value");
                        done();
                    });
                });

                it("Parses multi-line fields values", function (done) {
                    var parser = new Parser();
                    parser.parse(request, function (error, options, body) {
                        var bodyString = body.read().toString(), expected;
                        expected = [
                            'Dear Life Cereal, Where do you get off?',
                            'Part of a balanced breakfast and delicious? Who do you think',
                            'you are? By now, you may have guessed I\'m speaking',
                            'ironically and have nothing but good things to say about what',
                            'you do. Life Cereal, do not change a thing. Signed: Peter',
                            'Griffin. Dictated but not read.'
                        ].join("\n");
                        expected = "comments=" + encodeURIComponent(expected);
                        expect(bodyString).to.contain(expected);
                        done();
                    });
                });
            });
        });

        // TODO Does not override explicitly set headers
        // TODO content-length
        // TODO content-type

    });

});
