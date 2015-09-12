/* jshint node: true */
"use strict";

var url = require("url");

var Parser;

/**
 * @constructor
 */
function Parser() {
    this.eol = "\n";
    this.encoding = "utf8";
}

/**
 * Parse a string representing an HTTP request.
 *
 * @param {string} request HTTP request
 * @param {function} callback
 */
Parser.prototype.parse = function (request, callback) {

    var error,
        options,
        body,
        requestLine,
        lines,
        line,
        property,
        result;

    // Default options
    options = {
        method: "GET"
    };

    // Indicates the parse has not yet parsed the request line.
    requestLine = false;

    // Split the string into an array of lines.
    lines = request.split(this.eol);

    // Reverse the lines so we can pop them off.
    lines.reverse();

    while (lines.length > 0) {
        line = lines.pop().trim();
        if (!requestLine) {
            if (line !== "") {
                // When we reach the first non-empty line, parse it as the
                // request line and copy the result to the options.
                result = this._parseRequestLine(line);
                options.method = result.method;
                for (property in result.uri) {
                    options[property] = result.uri[property];
                }
                // Indicate that the request line has been parsed and continue.
                requestLine = true;
                continue;
            }
        } else {
            if (line === "") {
                // // Body begins.
                // lines.reverse();
                // body = lines.join(this.eol);
                // // TODO read length and pass as param
                // this.emit("body", stringToStream(body));
                break;
            } else {
                // this.emit("header", line);
            }
        }
    }

    callback(error, options, body);
};

Parser.prototype._parseRequestLine = function (requestLine) {
    var results = {}, words;
    words = requestLine.split(" ");
    if (words.length === 1) {
        // For one-word lines, use the default method; the word as the URI.
        results.method = "GET";
        results.uri = url.parse(words[0]);
    } else {
        // For two-or-more-word lines, the first word is the method; The
        // second is the URI; others are ignored.
        results.method = words[0];
        results.uri = url.parse(words[1]);
    }
    return results;
};

exports.Parser = Parser;
