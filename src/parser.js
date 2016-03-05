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
        if (line !== '') {
            this.parseLine(line);
        } else if (this.parsedRequestLine()) {
            // The first empty line after the header section indicates the body.
            this.parseBody(lines);
            break;
        }
    }
    this.ensureUri();
    // Merge the parsed query parameters onto the request path.
    this.result.options.path = mergeQuery(this.result.options.path, this.query);
};

Parser.prototype.ensureUri = function () {
    if (!this.result.options.host) {
        var hostHeaderValue = valueForCaseInsensitiveKey(
            this.result.options.headers, 'Host');
        if (hostHeaderValue) {
            var parts = hostHeaderValue.split(':', 2);
            if (parts.length === 1) {
                this.result.options.host = hostHeaderValue;
            } else {
                this.result.options.host = parts[0];
                this.result.options.port = parseInt(parts[1], 10);
            }
        }
    }
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
    var separator = earliestSubstring([':','='], line);
    if (separator) {
        var words = line.split(separator);
        var key = words[0].trim();
        this.query[key] = words.slice(1).join(separator).trim();
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
    var separator = earliestSubstring([':','='], line);
    if (separator) {
        var words = line.split(separator);
        var key = words[0].trim();
        var value = words.slice(1).join(separator).trim();
        try {
            value = JSON.parse(value);
        } catch (e) {
            // Do nothing. Retain unparsed value.
        }
        this.setResultOption(key, value);
    } else {
        this.setResultOption(line, true);
    }
};

Parser.prototype.setResultOption = function (key, value) {
    switch (key) {
        case 'protocol':
            this.result.options[key] = normalizeProtocol(value);
            break;
        case 'auth':
        case 'host':
        case 'port':
            this.result.options[key] = value;
            break;
        default:
            this.result.configuration[key] = value;
    }
};

Parser.prototype.parseHeaderLine = function (line) {
    var words = line.split(':');
    if (words.length > 1) {
        var key = words[0].trim();
        this.result.options.headers[key] = words.slice(1).join(':').trim();
    }
};

Parser.prototype.setConfiguration = function (configuration) {
    var userConfiguration = configuration || {};
    this.configuration = {
        eol: '\n'
    };
    var properties = Object.keys(userConfiguration);
    for (var i = 0; i < properties.length; ++i) {
        var property = properties[i];
        this.configuration[property] = userConfiguration[property];
    }
};

Parser.prototype.parsedRequestLine = function () {
    return !!this.result.options.method;
};

Parser.prototype.parseBody = function (lines) {
    lines.reverse();
    var body = lines.join(this.configuration.eol).trim();
    // Return the lines to the original order.
    if (body) {
        if (this.isForm()) {
            this.result.options.headers['Content-type'] = 'application/x-www-form-urlencoded';
            this.result.body = this.parseForm(body);
        } else {
            this.result.body = body;
        }
        // Do not override content-length header if set explicitly
        if (!valueForCaseInsensitiveKey(this.result.options.headers, 'content-length')) {
            this.result.options.headers['Content-length'] = '' + body.length;
        }
    }
};

Parser.prototype.isForm = function () {
    return this.result.configuration.form === true;
};

Parser.prototype.parseForm = function (body) {
    var formParser = new FormParser(this.configuration);
    return formParser.parse(body);
};

// -----------------------------------------------------------------------------

function FormParser(configuration) {
    this.setConfiguration(configuration);
    this.fields = {};
    this.multilineInProgress = false;
    this.multilineValue = null;
    this.multilineKey = null;
}

FormParser.prototype.setConfiguration = function (configuration) {
    var userConfiguration = configuration;
    this.configuration = {
        eol: '\r\n',
        multilineStart: '"""',
        multilineEnd: '"""'
    };
    var properties = Object.keys(userConfiguration);
    for (var i = 0; i < properties.length; ++i) {
        var property = properties[i];
        this.configuration[property] = userConfiguration[property];
    }
};

FormParser.prototype.parse = function (body) {
    // Split the string into an array of lines and reverse so that we can pop
    // lines off the stack and read them in order.
    var lines = body.split(this.configuration.eol);
    lines.reverse();
    while (lines.length > 0) {
        var line = lines.pop().trim();
        this.parseLine(line);
    }
    return querystring.stringify(this.fields);
};

FormParser.prototype.parseLine = function(line) {
    if (this.multilineInProgress) {
        this.parseMultilineField(line);
    } else {
        this.parseField(line);
    }
};

FormParser.prototype.isCommentLine = function (line) {
    return beginsWith(line, ['#', '//']);
};

FormParser.prototype.parseField = function (line) {
    if (this.isCommentLine(line)) {
        return; // no-op
    }
    var key, pos, separator, value, words;
    separator = earliestSubstring([':','='], line);
    if (separator) {
        words = line.split(separator);
        key = words[0].trim();
        value = words[1];
        // Check if this value begins a multiline field.
        pos = value.indexOf(this.configuration.multilineStart);
        if (pos !== -1) {
            value = value.slice(pos + this.configuration.multilineStart.length);
            // Check if this value also ends a multiline field.
            pos = value.indexOf(this.configuration.multilineEnd);
            if (pos !== -1) {
                // The entire multiline value is on one line.
                value = value.slice(0, pos);
            } else {
                // Start multiline.
                this.multilineInProgress = true;
                this.multilineKey = key;
                this.multilineValue = value;
                return;
            }
        }
        this.fields[key] = value.trim();
    }
};

FormParser.prototype.parseMultilineField = function (line) {
    if (this.isEndOfMultilineField(line)) {
        this.completeMultilineField(line);
    } else {
        this.continueMultilineField(line);
    }
};

FormParser.prototype.isEndOfMultilineField = function (line) {
    return line.indexOf(this.configuration.multilineEnd) !== -1;
};

FormParser.prototype.continueMultilineField = function (line) {
    this.multilineValue += this.configuration.eol + line;
};

FormParser.prototype.completeMultilineField = function (line) {
    var pos = line.indexOf(this.configuration.multilineEnd);
    this.fields[this.multilineKey] = this.multilineValue + this.configuration.eol + line.slice(0, pos);
    this.multilineInProgress = false;
};

// -----------------------------------------------------------------------------

function normalizeProtocol(protocol) {
    if (protocol.slice(0, 5) === 'https') {
        return 'https:';
    } else {
        return 'http:';
    }
}

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
 * @param {string[]} needles Strings to search for
 * @param {string} haystack String that should contains a needles
 * @return {string|undefined} The needles that occurs earlier in the haystack
 */
function earliestSubstring(needles, haystack) {
    var position, minPosition, minNeedle = undefined;
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

function valueForCaseInsensitiveKey(object, key) {
    var normalKey = key.toLowerCase();
    var keys = Object.keys(object);
    for (var i = 0; i < keys.length; ++i) {
        var originalKey = keys[i];
        if (originalKey.toLowerCase() === normalKey) {
            return object[originalKey];
        }
    }
}

// -----------------------------------------------------------------------------

module.exports = Parser;
