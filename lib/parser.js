/* jshint node: true */
"use strict";

var querystring = require("querystring"),
    url = require("url");

var Parser,
    earliestCharacter,
    mergeQuery;

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
        options = {
            headers: {}
        },
        body,
        // Indicates the parse has not yet parsed the request line.
        requestLine = false,
        lines,
        line,
        property,
        query = {},
        result;

    // Split the string into an array of lines.
    lines = request.split(this.eol);
    lines.reverse();
    while (lines.length > 0) {
        line = lines.pop().trim();
        if (!requestLine) {
            if (line !== "") {
                // When we reach the first non-empty line, parse it as the
                // request line and copy the result to the options.
                result = this._parseRequestLine(line);
                options.method = result.method;
                // TODO Don't copy all.
                for (property in result.uri) {
                    options[property] = result.uri[property];
                }
                // Indicate that the request line has been parsed and continue.
                requestLine = true;
                continue;
            }
        } else {
            if (line === "") {
                // Body begins.
                lines.reverse();
                body = lines.join(this.eol);
                // TODO add content-length header.
                // TODO read length and pass as param
                //this.emit("body", stringToStream(body));
                break;
            } else {
                // Header line.
                result = this._parseHeaderLine(line);
                switch (result.type) {
                    case "header":
                        options.headers[result.key] = result.value;
                        break;
                    case "query":
                        query[result.key] = result.value;
                        break;
                    case "option":
                        options[result.key] = result.value;
                        break;
                }
            }
        }
    }

    // Merge the parsed query parameters onto the request path.
    options.path = mergeQuery(options.path, query);

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
            // Query parameter
            line = line.slice(1).trim();
            separator = earliestCharacter([":","="], line);
            if (separator) {
                words = line.split(separator);
                key = words[0].trim();
                value = words[1].trim();
                result.type = "query";
                result.key = key;
                result.value = value;
            } else {
                result.type = "query";
                result.key = line;
                result.value = "";
            }
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
