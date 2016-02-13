"use strict";

var stream = require("stream"),
    querystring = require("querystring"),
    url = require("url");

var Parser;

/**
 * @constructor
 */
function Parser() {
    this.eol = "\n";
    this.encoding = "utf8";
}

/**
 * Synchronously parse a string representing an HTTP request.
 *
 * The method returns an object with containing these keys:
 *   - `.options`: An object of options for use with a `Client` or `http.request`
 *   - `.body`: A readable stream containing the request body.
 *
 * @param {string} request HTTP request
 * @return {object}
 */
Parser.prototype.parse = function (request) {
    var options = {
            headers: {}
        },
        body,
        // Indicates the parse has not yet parsed the request line.
        requestLine = false,
        lines,
        line,
        properties,
        property,
        query = {},
        result,
        i, u;

    // Split the string into an array of lines and reverse so that we can pop
    // lines off the stack and read them in order.
    lines = request.split(this.eol);
    lines.reverse();

    while (lines.length > 0) {
        line = lines.pop().trim();
        if (!requestLine) {
            if (line !== "") {
                // When we reach the first non-empty line, parse it as the
                // request line and copy data from the result to the options.
                result = this._parseRequestLine(line);
                properties = Object.keys(result);
                for (i = 0, u = properties.length; i < u; ++i) {
                    property = properties[i];
                    options[property] = result[property];
                }
                // Indicate that the request line has been parsed and continue.
                requestLine = true;
                continue;
            }
        } else {
            if (line === "") {
                // Body begins.

                // Return the lines to the original order.
                lines.reverse();

                // Encoded it as a form, if needed; or rebuild it as a string.
                if (options.form) {
                    // Encode the body as a form.
                    body = this._parseForm(lines);
                    if (body) {
                        if (!hasHeader(options.headers, "content-type")) {
                            options.headers["content-type"] = "application/x-www-form-urlencoded";
                        }
                    }
                } else {
                    // Re-join the lines into a single string.
                    body = lines.join(this.eol);
                }
                // Unset body if it's contain no non-whitespace characters.
                if (body && body.trim().length === 0) {
                    body = undefined;
                }
                // If body is still set, convert it to a string and add a
                // content-length header.
                if (body) {
                    if (!hasHeader(options.headers, "content-length")) {
                        options.headers["content-length"] = "" + body.length;
                    }
                    body = stringToStream(body);
                }
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

    return {
        error: undefined,
        options: options,
        body: body
    };
};

Parser.prototype._parseRequestLine = function (line) {
    var properties = [
            "protocol",
            "auth",
            "host",
            "port",
            "hostname",
            "path"
        ],
        results = {},
        uri,
        words;

    words = line.split(" ");
    if (words.length === 1) {
        // For one-word lines, use the default method; the word as the URI.
        results.method = "GET";
        uri = url.parse(words[0]);
    } else {
        // For two-or-more-word lines, the first word is the method; The
        // second is the URI; others are ignored.
        results.method = words[0];
        uri = url.parse(words[1]);
    }
    // Copy specific properties from the parsed URI to the results.
    properties.forEach(function (property) {
        results[property] = uri[property];
    });
    return results;
};

Parser.prototype._parseHeaderLine = function (line) {
    var words, key, value, separator, result;
    result = {};
    line = line.trim();

    // Skip comments
    if (beginsWith(line, ["#", "//"])) {
        return result;
    }

    switch (line.charAt(0)) {
        case "@":
            // Options
            line = line.slice(1).trim();
            separator = earlistSubstring([":","="], line);
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
            separator = earlistSubstring([":","="], line);
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
 * Parse an array of strings containing an unencoded form body in reverse order
 * and return a string containing the encoded form.
 *
 * @param  {string[]} body Reverse-order array of lines of the body
 * @return {string} Encoded form
 * @ignore
 */
Parser.prototype._parseForm = function (lines) {

    var eol = this.eol,
        fields = {},
        form,
        key,
        multiline;

    lines.forEach(function (line) {
        var pos, separator, value, words;

        if (multiline === undefined) {
            // This is the beginning of a new field.
            // Skip comment (lines beginning with #)
            if (beginsWith(line.trim(), ["#", "//"])) {
                return;
            }
            separator = earlistSubstring([":","="], line);
            if (separator) {
                words = line.split(separator);
                key = words[0].trim();
                value = words[1];
                // Check if this value begins a multiline field.
                pos = value.indexOf('"""');
                if (pos !== -1) {
                    value = value.slice(pos + 3);
                    // Check if this value also ends the tripple quoted value.
                    pos = value.indexOf('"""');
                    if (pos !== -1) {
                        // The entire quotes value is on one line.
                        value = value.slice(0, pos);
                    } else {
                        // Start multiline.
                        multiline = value;
                        return;
                    }
                }
                fields[key] = value.trim();
            }
        } else {
            // This is the continuation of a multiline field.
            // Check if this line ends the tripple quoted value.
            pos = line.indexOf('"""');
            if (pos !== -1) {
                fields[key] = multiline + eol + line.slice(0, pos);
                multiline = undefined;
            }
            multiline += eol + line;
        }
    });

    form = querystring.stringify(fields);
    if (form) {
        return form;
    }
    return;
};

/**
 * Tests if a string begins with any of the string in the array of needles.
 *
 * @param  {string} haystack String to test
 * @param  {string[]} needles Array of string to look for
 * @return {boolean} True indicates the string begins with one of the needles.
 */
function beginsWith(haystack, needles) {
    var needle, i, u;
    for (i = 0, u = needles.length; i < u; ++i) {
        needle = needles[i];
        if (haystack.substr(0, needle.length) === needle) {
            return true;
        }
    }
    return false;
}

/**
 * Given an array of substrings to search for (needles), return the substring
 * that occurs at the earliest location inside the haystack. If no needs
 * are present in the haystack, return undefined.
 *
 * @param {array} needles Strings to search for
 * @param {string} haystack String that should contains a needles
 * @return {string|undefined} The needles that occurs earlier in the haystack
 */
function earlistSubstring(needles, haystack) {
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
 * Case-insensitively test if a collection of headers contains a given header.
 *
 * @param {Object} headers Collection of headers
 * @param {string} header Header name to check for
 * @return {Boolean} The collection contains some varient of the header.
 */
function hasHeader(headers, header) {
    var name;
    for (name in headers) {
        if (name.toLowerCase() === header) {
            return true;
        }
    }
    return false;
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
    var parsed, properties, property, query, queryString, i, u;
    // Return the original path if the query to merge is empty.
    if (Object.keys(newQuery).length === 0) {
        return path;
    }
    // Parse the original path.
    parsed = url.parse(path, true);
    // Merge the queries to form a new query.
    query = parsed.query;
    properties = Object.keys(newQuery);
    for (i = 0, u = properties.length; i < u; ++i) {
        property = properties[i];
        query[property] = newQuery[property];
    }
    queryString = querystring.stringify(query);
    path = parsed.pathname + "?" + queryString;
    return path;
}

/**
 * Return a readable stream given a string.
 *
 * @param  {string} string The string contents for the stream
 * @return {stream.Readable} Readable stream containing the string
 */
function stringToStream(string) {
    var s = new stream.Readable();
    s.push(string);
    s.push(null);
    return s;
}

exports.Parser = Parser;
