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

    rqst = {
        headers: {}
    };
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
    requestParser.on("header",  function (line) {
        var words, key, value, separator;
        line = line.trim();
        switch (line.charAt(0)) {
            case "#":
                // Skip comments
                break;
            case "@":
                // Options
                separator = earliestCharacter([":","="], line);
                if (separator) {
                    words = line.split(separator);
                    key = words[0].trim().slice(1);
                    value = words[1].trim();
                    conf[key] = value;
                }
                break;
            case "?":
            case "&":
                // Query parameter
                break;
            default:
                // All other lines are headers
                words = line.split(":");
                key = words[0].trim();
                value = words[1].trim();
                rqst.headers[key] = value;
        }
    });
    requestParser.on("end", function () {
        callback(rqst, conf);
    });

    requestParser.parse(request);

};

/**
 * Given an array of substrings to search for (needles), return the substring
 * that occurs at the earliest location inside the haystack. If no needs
 * are present in the haystack, return undefined.
 *
 * @param  {array} needles Strings to search for
 * @param  {string} haystack String that should contains a needles
 * @return {string|undefined} The needles that occurs earlier in the haystack
 */
function earliestCharacter(needles, haystack) {
    var position, minPosition, minNeedle;
    minPosition = haystack.length;
    needles.forEach(function (needle) {
        position = haystack.indexOf(needle);
        if (position !== -1) {
            minPosition = Math.min(minPosition, position);
            if (minPosition === position) {
                minNeedle = needle;
            }
        }
    });
    return minNeedle;
};

exports.Parser = Parser;
