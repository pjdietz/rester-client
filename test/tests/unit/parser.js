'use strict';

var url = require('url');

var assert = require('chai').assert,
    expect = require('chai').expect;

var Parser = require('../../../src/parser');

// -----------------------------------------------------------------------------

describe('Parser', function () {

    it('Creates instance with default options', function () {
        var parser = new Parser();
        assert(parser !== undefined);
    });

    // -------------------------------------------------------------------------

    describe('Request line', function () {
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
                    var parser = new Parser(),
                        result = parser.parse(test.request);
                    expect(result.options.method).to.equal(test.method);
                });
            });
        });

        describe('Parses protocol', function () {
            requests.forEach(function (test) {
                it(test.description, function () {
                    var parser = new Parser(),
                        result = parser.parse(test.request);
                    expect(result.options.protocol).to.equal(test.protocol);
                });
            });
        });

        describe('Parses auth', function () {
            requests.forEach(function (test) {
                it(test.description, function () {
                    var parser = new Parser(),
                        result = parser.parse(test.request);
                    expect(result.options.auth).to.equal(test.auth);
                });
            });
        });

        describe('Parses host', function () {
            requests.forEach(function (test) {
                it(test.description, function () {
                    var parser = new Parser(),
                        result = parser.parse(test.request);
                    expect(result.options.host).to.equal(test.host);
                });
            });
        });

        describe('Parses hostname', function () {
            requests.forEach(function (test) {
                it(test.description, function () {
                    var parser = new Parser(),
                        result = parser.parse(test.request);
                    expect(result.options.hostname).to.equal(test.hostname);
                });
            });
        });

        describe('Parses port', function () {
            requests.forEach(function (test) {
                it(test.description, function () {
                    var parser = new Parser(),
                        result = parser.parse(test.request);
                    expect(result.options.port).to.equal(test.port);
                });
            });
        });

        describe('Parses path', function () {
            requests.forEach(function (test) {
                it(test.description, function () {
                    var parser = new Parser(),
                        result = parser.parse(test.request);
                    expect(result.options.path).to.equal(test.path);
                });
            });
        });

    }); // Request line

    // -------------------------------------------------------------------------

    describe('Headers, query, and options', function () {
        var request = [
            'POST http://mydomain.com/cats?cat=molly&dog=bear',
            '?cat=oscar',
            ' & hamster : Fizzgig',
            '?guineaPigs=Clyde and Claude',
            '&query',
            'Host: localhost',
            'Cache-control: no-cache',
            'Content-type: application/json',
            '  # This is a pound-comment',
            '  // This is a slash-comment',
            '@flag',
            '@followRedirects: true',
            '@redirectStatusCodes: [301, 302]',
            '@redirectLimit: 5',
            '@stringOption: "stringValue"',
            '@unquotedStringOption: stringValue=2',
            '',
            '{\'name\': \'molly\'}',
            ''
        ].join('\n');

        it('Parses headers', function () {
            var expectedHeaders = {
                    'Host': 'localhost',
                    'Cache-control': 'no-cache',
                    'Content-type': 'application/json',
                },
                headers = Object.keys(expectedHeaders),
                parser = new Parser(),
                result = parser.parse(request),
                header, i, u;
            for (i = 0, u = headers.length; i < u; ++i) {
                header = headers[i];
                expect(result.options.headers[header]).to.equal(expectedHeaders[header]);
            }
        });

        // ---------------------------------------------------------------------

        describe('Parses query', function () {

            it('Does not replace parameters in request line not overriden later', function () {
                var parser = new Parser(),
                    result = parser.parse(request),
                    query = url.parse(result.options.path, true).query;
                expect(query.dog).to.equal('bear');
            });

            it('Replaces parameters with overrides', function () {
                var parser = new Parser(),
                    result = parser.parse(request),
                    query = url.parse(result.options.path, true).query;
                expect(query.cat).to.equal('oscar');
            });

            it('Parses parameters starting with ?', function () {
                var parser = new Parser(),
                    result = parser.parse(request),
                    query = url.parse(result.options.path, true).query;
                expect(query.cat).to.equal('oscar');
            });

            it('Parses parameters starting with &', function () {
                var parser = new Parser(),
                    result = parser.parse(request),
                    query = url.parse(result.options.path, true).query;
                expect(query.hamster).to.equal('Fizzgig');
            });

            it('Parses parameters separated with =', function () {
                var parser = new Parser(),
                    result = parser.parse(request),
                    query = url.parse(result.options.path, true).query;
                expect(query.cat).to.equal('oscar');
            });

            it('Parses parameters separated with :', function () {
                var parser = new Parser(),
                    result = parser.parse(request),
                    query = url.parse(result.options.path, true).query;
                expect(query.hamster).to.equal('Fizzgig');
            });

            it('Parses parameters with no values', function () {
                var parser = new Parser(),
                    result = parser.parse(request),
                    query = url.parse(result.options.path, true).query;
                expect(query.query).to.equal('');
            });

        }); // Parses query

        // ---------------------------------------------------------------------

        describe('Parses options', function () {

            it('Parses flag options', function () {
                var parser = new Parser(),
                    result = parser.parse(request);
                expect(result.options.flag).to.be.a('boolean');
                expect(result.options.flag).to.equal(true);
            });

            it('Parses boolean options', function () {
                var parser = new Parser(),
                    result = parser.parse(request);
                expect(result.options.followRedirects).to.be.a('boolean');
                expect(result.options.followRedirects).to.equal(true);
            });

            it('Parses number options', function () {
                var parser = new Parser(),
                    result = parser.parse(request);
                expect(result.options.redirectLimit).to.be.a('number');
                expect(result.options.redirectLimit).to.equal(5);
            });

            it('Parses array options', function () {
                var parser = new Parser(),
                    result = parser.parse(request);
                expect(result.options.redirectStatusCodes).to.be.a('array');
                expect(result.options.redirectStatusCodes).to.have.length(2);
                expect(result.options.redirectStatusCodes).to.include(301);
                expect(result.options.redirectStatusCodes).to.include(302);
            });

            it('Parses string options with quotes', function () {
                var parser = new Parser(),
                    result = parser.parse(request);
                expect(result.options.stringOption).to.be.a('string');
                expect(result.options.stringOption).to.equal('stringValue');
            });

            it('Parses string options without quotes', function () {
                var parser = new Parser(),
                    result = parser.parse(request);
                expect(result.options.unquotedStringOption).to.be.a('string');
                expect(result.options.unquotedStringOption).to.equal('stringValue=2');
            });

        }); // Parses ptions

        describe('Comments', function () {
            it('Skips lines begining with #', function () {
                var parser = new Parser(),
                    result = parser.parse(request);
                expect(result.options.toString()).to.not.contain('pound-comment');
            });
            it('Skips lines begining with //', function () {
                var parser = new Parser(),
                    result = parser.parse(request);
                expect(result.options.toString()).to.not.contain('slash-comment');
            });
        }); // Comments

    }); // Headers, query, and options

    // -------------------------------------------------------------------------

    describe('Body', function () {

        describe('String body', function () {
            var request = [
                'POST http://mydomain.com/cats',
                'Host: localhost',
                'Content-type: application/json',
                '',
                '{"name": "molly"}'
            ].join('\n');

            it('Provides body as string', function () {
                var parser = new Parser(),
                    result = parser.parse(request);
                expect(result.body).to.equal('{"name": "molly"}');
            });
            it('Adds content-length header', function () {
                var parser = new Parser(),
                    result = parser.parse(request);
                expect(result.options.headers['content-length']).to.equal('17');
            });
        }); // String body

        // ---------------------------------------------------------------------

        describe('No string body', function () {

            var request = [
                'GET http://mydomain.com/cats',
                'Host: localhost',
                'Content-type: application/json',
                '',
                '',
                ''
            ].join('\n');

            it('Body is undefined when no body is present', function () {
                var parser = new Parser(),
                    result = parser.parse(request);
                expect(result.body).to.be.undefined;
            });
            it('No content-length header is added when no body is present', function () {
                var parser = new Parser(),
                    result = parser.parse(request),
                    headers = Object.keys(result.options.headers),
                    countHeaders = 0, header, i, u;
                for (i = 0, u = headers.length; i < u; ++i) {
                    header = headers[i];
                    if (header.toLowerCase() === 'content-length') {
                        ++countHeaders;
                    }
                }
                expect(countHeaders).to.equal(0);
            });
        }); // No string body

        // ---------------------------------------------------------------------

        describe('Forms', function () {

            var request = [
                'POST http://mydomain.com/cats',
                'Host: localhost',
                '@form',
                '',
                'cat=molly',
                ' dog: bear',
                'guineaPigs: Clyde and Claude',
                '  # comment: Ignore this pound-comment',
                '  // comment: Ignore this slash-comment',
                '    quoted = """This is the value""" This is ignored.',
                'comments: """Dear Life Cereal, Where do you get off?',
                'Part of a balanced breakfast and delicious? Who do you think',
                'you are? By now, you may have guessed I\'m speaking',
                'ironically and have nothing but good things to say about what',
                'you do. Life Cereal, do not change a thing. Signed: Peter',
                'Griffin. Dictated but not read."""',
            ].join('\n');

            it('Adds Content-type header when @form option is true', function () {
                var parser = new Parser(),
                    result = parser.parse(request);
                expect(result.options.headers['content-type'].toLowerCase())
                    .to.equal('application/x-www-form-urlencoded');
            });

            // -----------------------------------------------------------------

            describe('Encodes form fields when @form option is true', function () {
                it('Uses = separator', function () {
                    var parser = new Parser(),
                        result = parser.parse(request);
                    expect(result.body).to.contain('cat=molly');
                });
                it('Uses : separator', function () {
                    var parser = new Parser(),
                        result = parser.parse(request);
                    expect(result.body).to.contain('dog=bear');
                });
                it('Percent encodes values', function () {
                    var parser = new Parser(),
                        result = parser.parse(request);
                    expect(result.body).to.contain('guineaPigs=Clyde%20and%20Claude');
                });
                it('Parses values in tripple quotes', function () {
                    var parser = new Parser(),
                        result = parser.parse(request);
                    expect(result.body).to.contain('quoted=This%20is%20the%20value');
                });
                it('Parses multi-line fields values', function () {
                    var parser = new Parser(),
                        result = parser.parse(request),
                        expected = [
                            'Dear Life Cereal, Where do you get off?',
                            'Part of a balanced breakfast and delicious? Who do you think',
                            'you are? By now, you may have guessed I\'m speaking',
                            'ironically and have nothing but good things to say about what',
                            'you do. Life Cereal, do not change a thing. Signed: Peter',
                            'Griffin. Dictated but not read.'
                        ].join('\n');
                    expected = 'comments=' + encodeURIComponent(expected);
                    expect(result.body).to.contain(expected);
                });

                // -------------------------------------------------------------

                describe('Comments', function () {
                    it('Skips lines beginning with #', function () {
                        var parser = new Parser(),
                            result = parser.parse(request);
                        expect(result.body).to.not.contain('pount-comment');
                    });
                    it('Skips lines beginning with //', function () {
                        var parser = new Parser(),
                            result = parser.parse(request);
                        expect(result.body).to.not.contain('slash-comment');
                    });
                }); // Comments

            }); // Encodes form fields when @form option is true

            // -----------------------------------------------------------------

            describe('Empty form', function () {
                var request = [
                    'GET http://mydomain.com/cats',
                    'Host: localhost',
                    '@form',
                    '',
                    '',
                    ''
                ].join('\n');

                it('Body is undefined when no body is present', function () {
                    var parser = new Parser(),
                        result = parser.parse(request);
                    expect(result.body).to.be.undefined;
                });
                it('Body is undefined when no body is present', function () {
                    var parser = new Parser(),
                        result = parser.parse(request),
                        headers = Object.keys(result.options.headers),
                        countHeaders = 0, header, i, u;
                    for (i = 0, u = headers.length; i < u; ++i) {
                        header = headers[i];
                        if (header.toLowerCase() === 'content-length') {
                            ++countHeaders;
                        }
                    }
                    expect(countHeaders).to.equal(0);
                });
            }); // Empty form

        }); // Forms

        // ---------------------------------------------------------------------

        describe('Does not override explicitly set headers', function () {
            var request = [
                'POST /cats',
                'Host: localhost',
                'content-length: 100',
                'content-type: application/json',
                '@form',
                '',
                'name=molly',
            ].join('\n');

            it('Content-length', function () {
                var parser = new Parser(),
                    result = parser.parse(request);
                expect(result.options.headers['content-length']).to.equal('100');
            });
            it('Content-type', function () {
                var parser = new Parser(),
                    result = parser.parse(request);
                expect(result.options.headers['content-type']).to.equal('application/json');
            });
        }); // Does not override explicitly set headers
    });
}); // Parser
