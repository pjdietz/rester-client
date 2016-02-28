'use strict';

var querystring = require('querystring'),
    url = require('url');

// -----------------------------------------------------------------------------

function Parser(configuration) {
    this.setConfiguration(configuration);
    this.query = null;
    this.result = null;
}

Parser.prototype.parse = function (request) {
    this.query = {};
    this.initializeResult();
    this.parseRequest(request);
    return this.result;
};

Parser.prototype.initializeResult = function () {
    this.result = {
        options: {
            headers: {}
        },
        body: {},
        configuration: {}
    };
};

Parser.prototype.parseRequest = function (request) {
    // Split the string into an array of lines and reverse so that we can pop
    // lines off the stack and read them in order.
    var lines = request.split(this.configuration.eol);
    var line;
    lines.reverse();
    while (lines.length > 0) {
        line = lines.pop().trim();
        this.parseLine(line);
    }
    // Merge the parsed query parameters onto the request path.
    this.result.options.path = mergeQuery(this.result.options.path, this.query);
};

Parser.prototype.parseLine = function (line) {
    if (!this.parsedRequestLine()) {
        this.parseRequestLine(line);
    } else {
        this.parseHeaderSectionLine(line);
    }
};

Parser.prototype.parseRequestLine = function (line) {
    var properties = [
            'protocol',
            'auth',
            'host',
            'port',
            'hostname',
            'path'
        ];
    var words = line.split(' ');
    var uri;

    if (words.length === 1) {
        // For one-word lines, use the default method; the word as the URI.
        this.result.options.method = 'GET';
        uri = url.parse(words[0]);
    } else {
        // For two-or-more-word lines, the first word is the method; The
        // second is the URI; others are ignored.
        this.result.options.method = words[0];
        uri = url.parse(words[1]);
    }
    // Copy specific properties from the parsed URI to the results.
    for (var i = 0; i < properties.length; ++i) {
        var property = properties[i];
        this.result.options[property] = uri[property];
    }
};

Parser.prototype.parseHeaderSectionLine = function (line) {
    if (this.isCommentLine(line)) {
        // No-op
    } else if (this.isQueryLine(line)) {
        this.parseQueryLine(line);
    } else if (this.isOptionLine(line)) {
        this.parseOptionLine(line);
    } else {
        this.parseHeaderLine(line);
    }
};

Parser.prototype.isCommentLine = function (line) {
    return beginsWith(line, ['#', '//']);
};

Parser.prototype.isQueryLine = function (line) {
    return beginsWith(line, ['?', '&']);
};

Parser.prototype.parseQueryLine = function (line) {
    // Query parameter
    line = line.slice(1).trim();
    var separator = earlistSubstring([':','='], line);
    if (separator) {
        var words = line.split(separator);
        var key = words[0].trim();
        var value = words[1].trim();
        this.query[key] = value;
    } else {
        this.query[line] = '';
    }
};

Parser.prototype.isOptionLine = function (line) {
    return line.charAt(0) == '@';
};

Parser.prototype.parseOptionLine = function (line) {
    // Query parameter
    line = line.slice(1).trim();
    var separator = earlistSubstring([':','='], line);
    if (separator) {
        var words = line.split(separator);
        var key = words[0].trim();
        var value = words[1].trim();
        try {
            value = JSON.parse(value);
        } catch (e) {
            // Do nothing. Retain unparsed value.
        }
        this.result.configuration[key] = value;
    } else {
        this.result.configuration[line] = true;
    }
};

Parser.prototype.parseHeaderLine = function (line) {
    var words = line.split(':');
    if (words.length > 1) {
        var key = words[0].trim();
        var value = words[1].trim();
        this.result.options.headers[key] = value;
    }
};

Parser.prototype.setConfiguration = function (configuration) {
    var userConfiguration = configuration || {};
    this.configuration = {
        ecoding: 'utf8',
        eol: '\r\n'
    };
    for (var property in this.configuration) {
        if (userConfiguration[property]) {
            this.confguration[property] = userConfiguration[property];
        }
    }
};

Parser.prototype.parsedRequestLine = function () {
    return !!this.result.options.method;
};

// -----------------------------------------------------------------------------

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
    path = parsed.pathname + '?' + queryString;
    return path;
}

// -----------------------------------------------------------------------------

module.exports = Parser;
