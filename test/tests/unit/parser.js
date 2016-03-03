'use strict';

var url = require('url');

var expect = require('chai').expect;

var eol = '\r\n',
    encoding = 'utf-8';

var Parser = require('../../../src/parser');

describe('Parser', function () {

    var parser;

    beforeEach(function () {
        parser = new Parser({
            encoding: encoding,
            eol: eol
        });
    });

    context('When parsing request line', function () {
        var requests = [
            {
                description: 'No method, URI',
                request: 'http://localhost/dogs',
                method: 'GET',
                protocol: 'http:',
                auth: null,
                host: 'localhost',
                hostname: 'localhost',
                port: null,
                path: '/dogs'
            },
            {
                description: 'No method, URI with port',
                request: 'http://localhost:8080/dogs?name=bear',
                method: 'GET',
                protocol: 'http:',
                auth: null,
                host: 'localhost:8080',
                hostname: 'localhost',
                port: '8080',
                path: '/dogs?name=bear'
            },
            {
                description: 'Method, path only',
                request: 'POST /cats',
                method: 'POST',
                protocol: null,
                auth: null,
                host: null,
                hostname: null,
                port: null,
                path: '/cats'
            },
            {
                description: 'Blank lines at start',
                request: ['', '   ', 'PUT /hamsters'].join('\n'),
                method: 'PUT',
                protocol: null,
                auth: null,
                host: null,
                hostname: null,
                port: null,
                path: '/hamsters'
            },
            {
                description: 'Method, path, and version',
                request: 'OPTIONS /guinea-pigs HTTP/1.1',
                method: 'OPTIONS',
                protocol: null,
                auth: null,
                host: null,
                hostname: null,
                port: null,
                path: '/guinea-pigs'
            },
            {
                description: 'Authority',
                request: 'DELETE https://fry:secret@mydomain.com/cats',
                method: 'DELETE',
                protocol: 'https:',
                auth: 'fry:secret',
                host: 'mydomain.com',
                hostname: 'mydomain.com',
                port: null,
                path: '/cats'
            },
        ];
        describe('Parses method', function () {
            requests.forEach(function (test) {
                it(test.description, function () {
                    var result = parser.parse(test.request);
                    expect(result.options.method).to.equal(test.method);
                });
            });
        });
        describe('Parses protocol', function () {
            requests.forEach(function (test) {
                it(test.description, function () {
                    var result = parser.parse(test.request);
                    expect(result.options.protocol).to.equal(test.protocol);
                });
            });
        });
        describe('Parses auth', function () {
            requests.forEach(function (test) {
                it(test.description, function () {
                    var result = parser.parse(test.request);
                    expect(result.options.auth).to.equal(test.auth);
                });
            });
        });
        describe('Parses host', function () {
            requests.forEach(function (test) {
                it(test.description, function () {
                    var result = parser.parse(test.request);
                    expect(result.options.host).to.equal(test.host);
                });
            });
        });
        describe('Parses hostname', function () {
            requests.forEach(function (test) {
                it(test.description, function () {
                    var result = parser.parse(test.request);
                    expect(result.options.hostname).to.equal(test.hostname);
                });
            });
        });
        describe('Parses port', function () {
            requests.forEach(function (test) {
                it(test.description, function () {
                    var result = parser.parse(test.request);
                    expect(result.options.port).to.equal(test.port);
                });
            });
        });
        describe('Parses path', function () {
            requests.forEach(function (test) {
                it(test.description, function () {
                    var result = parser.parse(test.request);
                    expect(result.options.path).to.equal(test.path);
                });
            });
        });
    });
    context('When parsing headers, query, and options', function () {
        var request = [
            'POST http://mydomain.com/cats?cat=molly&dog=bear',
            '?cat=oscar',
            ' & hamster : Fizzgig',
            '?guineaPigs=Clyde and Claude',
            '&query',
            'Host: localhost',
            'Cache-control: no-cache',
            'Content-type: application/json',
            '  # This is a pound-comment: not a header',
            '  // This is a slash-comment= not a header',
            '@flag',
            '@followRedirects: true',
            '@redirectStatusCodes: [301, 302]',
            '@redirectLimit: 5',
            '@stringOption: "stringValue"',
            '@unquotedStringOption: stringValue=2',
            '',
            '{\'name\': \'molly\'}',
            ''
        ].join(eol);

        it('Parses headers', function () {
            var expectedHeaders = {
                    'Host': 'localhost',
                    'Cache-control': 'no-cache',
                    'Content-type': 'application/json',
                },
                headers = Object.keys(expectedHeaders),
                result = parser.parse(request),
                header, i, u;
            for (i = 0, u = headers.length; i < u; ++i) {
                header = headers[i];
                expect(result.options.headers[header]).to.equal(expectedHeaders[header]);
            }
        });

        describe('Parses query', function () {
            it('Does not replace parameters in request line not overriden later', function () {
                var result = parser.parse(request),
                    query = url.parse(result.options.path, true).query;
                expect(query.dog).to.equal('bear');
            });
            it('Replaces parameters with overrides', function () {
                var result = parser.parse(request),
                    query = url.parse(result.options.path, true).query;
                expect(query.cat).to.equal('oscar');
            });
            it('Parses parameters starting with ?', function () {
                var result = parser.parse(request),
                    query = url.parse(result.options.path, true).query;
                expect(query.cat).to.equal('oscar');
            });
            it('Parses parameters starting with &', function () {
                var result = parser.parse(request),
                    query = url.parse(result.options.path, true).query;
                expect(query.hamster).to.equal('Fizzgig');
            });
            it('Parses parameters separated with =', function () {
                var result = parser.parse(request),
                    query = url.parse(result.options.path, true).query;
                expect(query.cat).to.equal('oscar');
            });
            it('Parses parameters separated with :', function () {
                var result = parser.parse(request),
                    query = url.parse(result.options.path, true).query;
                expect(query.hamster).to.equal('Fizzgig');
            });
            it('Parses parameters with no values', function () {
                var result = parser.parse(request),
                    query = url.parse(result.options.path, true).query;
                expect(query.query).to.equal('');
            });
        });

        describe('Parses configuration', function () {
            it('Parses flag options', function () {
                var result = parser.parse(request);
                expect(result.configuration.flag).to.be.a('boolean');
                expect(result.configuration.flag).to.equal(true);
            });
            it('Parses boolean options', function () {
                var result = parser.parse(request);
                expect(result.configuration.followRedirects).to.be.a('boolean');
                expect(result.configuration.followRedirects).to.equal(true);
            });
            it('Parses number options', function () {
                var result = parser.parse(request);
                expect(result.configuration.redirectLimit).to.be.a('number');
                expect(result.configuration.redirectLimit).to.equal(5);
            });
            it('Parses array options', function () {
                var result = parser.parse(request);
                expect(result.configuration.redirectStatusCodes).to.be.a('array');
                expect(result.configuration.redirectStatusCodes).to.have.length(2);
                expect(result.configuration.redirectStatusCodes).to.include(301);
                expect(result.configuration.redirectStatusCodes).to.include(302);
            });
            it('Parses string options with quotes', function () {
                var result = parser.parse(request);
                expect(result.configuration.stringOption).to.be.a('string');
                expect(result.configuration.stringOption).to.equal('stringValue');
            });
            it('Parses string options without quotes', function () {
                var result = parser.parse(request);
                expect(result.configuration.unquotedStringOption).to.be.a('string');
                expect(result.configuration.unquotedStringOption).to.equal('stringValue=2');
            });
        });

        describe('Comments', function () {
            it('Skips lines begining with #', function () {
                var result = parser.parse(request);
                expect(result.options.toString()).to.not.contain('pound-comment');
            });
            it('Skips lines begining with //', function () {
                var result = parser.parse(request);
                expect(result.options.toString()).to.not.contain('slash-comment');
            });
        });

        describe('URI', function () {
            var result;
            beforeEach(function () {
                result = {};
            });
            context('When the request line specifies a host', function () {
                context('And request does not contains options or a Host header', function () {
                    beforeEach(function () {
                        result = parser.parse('GET http://myhost.com');
                    });
                    it('Uses URI parsed from request line', function () {
                        expect(result.options.protocol).to.equal('http:');
                        expect(result.options.host).to.equal('myhost.com');
                        expect(result.options.port).to.be.null;
                    });
                    it('Does not supply a host header', function () {
                        expect(result.options.headers.Host).not.to.be.defined;
                    });
                });
                context('And request contains options but no Host header', function () {
                    beforeEach(function () {
                        result = parser.parse([
                            'GET http://myhost.com',
                            '@protocol: https',
                            '@host: yourhost.com',
                            '@port: 8080',
                            '@auth: rufus:secret'
                        ].join(eol));
                    });
                    it('Uses URI parsed from request line', function () {
                        expect(result.options.protocol).to.equal('https:');
                        expect(result.options.host).to.equal('yourhost.com');
                        expect(result.options.port).to.equal(8080);
                        expect(result.options.auth).to.equal('rufus:secret');
                    });
                    it('Does not supply a Host header', function () {
                        expect(result.options.headers.Host).not.to.be.defined;
                    });
                });
                context('And request contains Host header', function () {
                    beforeEach(function () {
                        result = parser.parse([
                            'GET http://myhost.com',
                            'Host: yourdomain.com'
                        ].join(eol));
                    });
                    it('Uses URI parsed from request line', function () {
                        expect(result.options.protocol).to.equal('http:');
                        expect(result.options.host).to.equal('myhost.com');
                        expect(result.options.port).to.be.null;
                    });
                    it('Includes provided Host header', function () {
                        expect(result.options.headers.Host).to.equal('yourdomain.com');
                    });
                });
            });
            context('When the request line does not specify a host', function () {
                context('And request does not contains options or a Host header', function () {
                    beforeEach(function () {
                        result = parser.parse('GET / HTTP/1.1');
                    });
                    it('Does not provide a URI', function () {
                        expect(result.options.protocol).to.be.null;
                        expect(result.options.host).to.be.null;
                        expect(result.options.port).to.be.null;
                    });
                    it('Does not supply a host header', function () {
                        expect(result.options.headers.Host).not.to.be.defined;
                    });
                });
                context('And request contains options but no Host header', function () {
                    beforeEach(function () {
                        result = parser.parse([
                            'GET / HTTP/1.1',
                            '@protocol: https',
                            '@host: yourhost.com',
                            '@port: 8080',
                            '@auth: rufus:secret'
                        ].join(eol));
                    });
                    it('Uses URI parsed from request line', function () {
                        expect(result.options.protocol).to.equal('https:');
                        expect(result.options.host).to.equal('yourhost.com');
                        expect(result.options.port).to.equal(8080);
                        expect(result.options.auth).to.equal('rufus:secret');
                    });
                    it('Does not supply a Host header', function () {
                        expect(result.options.headers.Host).not.to.be.defined;
                    });
                });
                context('And request contains Host header', function () {
                    beforeEach(function () {
                        result = parser.parse([
                            'GET / HTTP/1.1',
                            'Host: yourdomain.com:9090'
                        ].join(eol));
                    });
                    it('Uses URI parsed from Host header', function () {
                        // expect(result.options.protocol).to.equal('http:');
                        expect(result.options.host).to.equal('yourdomain.com');
                        // expect(result.options.port).to.equal(9090);
                    });
                    it('Includes provided Host header', function () {
                        expect(result.options.headers.Host).to.equal('yourdomain.com');
                    });
                });
            });
        });
    });

    describe('Body', function () {
        describe('With body', function () {
            var result;
            beforeEach(function () {
                var request = [
                    'POST http://mydomain.com/cats',
                    'Host: localhost',
                    'Content-type: application/json',
                    '',
                    '{"name": "molly"}'
                ].join(eol);
                result = parser.parse(request);
            });
            it('Provides body as string', function () {
                expect(result.body).to.equal('{"name": "molly"}');
            });
            it('Adds content-length header', function () {
                expect(result.options.headers['content-length']).to.equal('17');
            });
        });

        describe('Without body', function () {
            var result;
            beforeEach(function () {
                var request = [
                    'GET http://mydomain.com/cats',
                    'Host: localhost',
                    'Content-type: application/json',
                    '',
                    '',
                    ''
                ].join(eol);
                result = parser.parse(request);
            });

            it('Body is undefined when no body is present', function () {
                expect(result.body).to.be.undefined;
            });
            it('No content-length header is added when no body is present', function () {
                var headers = Object.keys(result.options.headers),
                    countHeaders = 0, header, i, u;
                for (i = 0, u = headers.length; i < u; ++i) {
                    header = headers[i];
                    if (header.toLowerCase() === 'content-length') {
                        ++countHeaders;
                    }
                }
                expect(countHeaders).to.equal(0);
            });
        });
    });

    // TODO: Parse body

});
