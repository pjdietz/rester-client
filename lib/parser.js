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
        headers: {}
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
                // Header line.
                result = this._parseHeaderLine(line);
                switch (result.type) {
                    case "header":
                        options.headers[result.key] = result.value;
                        break;
                    case "option":
                        options[result.key] = result.value;
                        break;
                }
            }
        }
    }

    callback(error, options, body);
};

Parser.prototype._parseRequestLine = function (line) {
    var results = {}, words;
    words = line.split(" ");
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

Parser.prototype._parseHeaderLine = function (line) {
    var words, key, value, separator, result;
    result = {};
    line = line.trim();
    switch (line.charAt(0)) {
        case "#":
            // Skip comments
            break;
        case "@":
            // Options
            line = line.slice(1).trim();
            separator = earliestCharacter([":","="], line);
            if (separator) {
                words = line.split(separator);
                key = words[0].trim();
                value = words[1].trim();
                try {
                    value = JSON.parse(value);
                } catch (e) {
                    // Do nothing. Retain unparsed value.
                }
                result.type = "option";
                result.key = key;
                result.value = value;
            } else {
                // No separator indicates a boolean true "flag" option.
                result.type = "option";
                result.key = line;
                result.value = true;
            }
            break;
        case "?":
        case "&":
            // // Query parameter
            // line = line.slice(1).trim();
            // separator = earliestCharacter([":","="], line);
            // if (separator) {
            //     words = line.split(separator);
            //     key = words[0].trim();
            //     value = words[1].trim();
            //     query[key] = value;
            // }
            // rqst.path = "/?cat=Molly";
            break;
        default:
            // All other lines are headers
            words = line.split(":");
            key = words[0].trim();
            value = words[1].trim();
            result.type = "header";
            result.key = key;
            result.value = value;
    }
    return result;
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

exports.Parser = Parser;
