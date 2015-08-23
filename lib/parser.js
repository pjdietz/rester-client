var Parser;

var EventEmitter = require("events").EventEmitter;
var stream = require("stream");
var util = require("util");
var StringParser = require("./stringParser").StringParser;
var url = require("url");

/**
 * @constructor
 */
function Parser(options) {
    var options = options || {};

    EventEmitter.call(this);

    if (options.stringParser === undefined) {
        options.stringParser = new StringParser();
    }

    this._stringParser = options.stringParser;
    this.eol = "\n";
    this.encoding = "utf8";
}

util.inherits(Parser, EventEmitter);

/**
 * Parse a string or stream representing an HTTP request.
 *
 * @param {string|stream.Readable} str HTTP request
 */
Parser.prototype.parse = function (request, configuration, callback) {

    var rqst, conf, requestParser;

    rqst = {};
    conf = configuration || {};

    // TODO use stream parser if request is a stream.
    // TODO emit error if neither.
    requestParser = this._stringParser;
    requestParser.removeAllListeners();
    requestParser.on("requestLine", function (requestLine) {

        var words, uri;

        words = requestLine.split(" ");

        if (words.length === 1) {
            // For one-word lines, default to GET for the method; treat the
            // word as the URI.
            rqst.method = "GET";
            uri =  url.parse(words[0]);
        } else {
            // For two-or-more-word lines, the first word is the method; The
            // second is the URI; others are ignored.
            rqst.method = words[0];
            uri =  url.parse(words[1]);
        }

        rqst.path = uri.path;
        if (uri.host) {
            rqst.host = uri.host;
        }
        if (uri.hostname) {
            rqst.hostname = uri.hostname;
        }
        if (uri.port) {
            rqst.port = uri.port;
        }
    });
    requestParser.on("end", function () {
        callback(rqst, conf);
    });

    requestParser.parse(request);

};

exports.Parser = Parser;
