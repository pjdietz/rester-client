/* jshint node: true, mocha: true */
"use strict";

var assert = require("chai").assert,
    expect = require("chai").expect;

var Parser = require("../lib/parser").Parser;

describe("Parser", function () {

    describe("Construction", function () {
        it("Creates instance with default options", function () {
            var parser = new Parser();
            assert(parser !== undefined);
        });
    });

    describe("Request Line", function () {

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

    });

});
