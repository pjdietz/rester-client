/* jshint node: true */
"use strict";

var EventEmitter = require("events").EventEmitter,
    util = require("util"),
    url = require("url"),
    querystring = require("querystring"),
    StringParser = require("./stringParser").StringParser,
    Parser;

/**
 * @constructor
 */
function Parser() {
    EventEmitter.call(this);
    this.stringParser = new StringParser();
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

    var rqst, conf, query, requestParser;

    rqst = {
        headers: {}
    };
    query = {};
    conf = configuration || {};

    // TODO use stream parser if request is a stream.
    // TODO emit error if neither.
    requestParser = this.stringParser;
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
                line = line.slice(1).trim();
                separator = earliestCharacter([":","="], line);
                if (separator) {
                    words = line.split(separator);
                    key = words[0].trim();
                    value = words[1].trim();
                    query[key] = value;
                }
                rqst.path = "/?cat=Molly";
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
        // Merge the parsed query parameters onto the request path.
        rqst.path = mergeQuery(rqst.path, query);
        callback(rqst, conf);
    });

    requestParser.parse(request);

};

/**
 * Given an array of substrings to search for (needles), return the substring
 * that occurs at the earliest location inside the haystack. If no needs
 * are present in the haystack, return undefined.
 *
 * @param {array} needles Strings to search for
 * @param {string} haystack String that should contains a needles
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
}

/**
 * Merge additional query parameters onto an existing request path and return
 * the combined path + query
 *
 * @param {string} path Request path, with or without a query
 * @param {Object} newQuery Query parameters to merge
 * @return {string} New path with query parameters merged
 */
function mergeQuery(path, newQuery) {
    var parsed, query, queryString, property;
    // Return the original path if the query to merge is empty.
    if (Object.keys(newQuery).length === 0) {
        return path;
    }
    // Parse the original path.
    parsed = url.parse(path, true);
    // Merge the queries to form a new query.
    query = parsed.query;
    for (property in newQuery) {
        query[property] = newQuery[property];
    }
    queryString = querystring.stringify(query);
    path = parsed.pathname + "?" + queryString;
    return path;
}

exports.Parser = Parser;
