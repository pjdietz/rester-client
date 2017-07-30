'use strict';

const querystring = require('querystring');
const url = require('url');

// -----------------------------------------------------------------------------

class Parser {

    constructor(configuration) {
        this.setConfiguration(configuration);
        this.query = null;
        this.result = null;
    }

    parse(request) {
        this.query = {};
        this.initializeResult();
        this.parseRequest(request);
        return this.result;
    }

    initializeResult() {
        this.result = {
            options: {
                headers: {}
            },
            configuration: {}
        };
    }

    parseRequest(request) {
        // Split the string into an array of lines and reverse so that we can pop
        // lines off the stack and read them in order.
        let lines = request.split('\n');
        let line;
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
    }

    ensureUri() {
        if (!this.result.options.hostname) {
            let hostHeaderValue = valueForCaseInsensitiveKey(
                this.result.options.headers, 'Host');
            if (hostHeaderValue) {
                let parts = hostHeaderValue.split(':', 2);
                if (parts.length === 1) {
                    this.result.options.hostname = hostHeaderValue;
                } else {
                    this.result.options.hostname = parts[0];
                    this.result.options.port = parseInt(parts[1], 10);
                }
            }
        }
    }

    parseLine(line) {
        if (!this.parsedRequestLine()) {
            this.parseRequestLine(line);
        } else {
            this.parseHeaderSectionLine(line);
        }
    }

    parseRequestLine(line) {
        // Skip comments
        if (beginsWith(line, ['#', '//'])) {
            return;
        }
        const properties = [
            'protocol',
            'auth',
            'host',
            'port',
            'hostname',
            'path'
        ];
        let words = line.split(' ');
        let uri;

        if (words.length === 1) {
            // For one-word lines, use the default method; the word as the URI.
            this.result.options.method = 'GET';
            uri = this.parseUri(words[0]);
        } else {
            // For two-or-more-word lines, the first word is the method; The
            // second is the URI; others are ignored.
            this.result.options.method = words[0];
            uri = this.parseUri(words[1]);
        }
        // Copy specific properties from the parsed URI to the results.
        for (let i = 0; i < properties.length; ++i) {
            let property = properties[i];
            this.result.options[property] = uri[property];
        }
        // Ensure the options contain a protocol.
        if (!this.result.options.protocol) {
            this.result.options.protocol = normalizeProtocol('');
        }
    }

    parseUri(uri) {
        if (!this.isPathOnly(uri) && !this.containsProtocol(uri)) {
            uri = 'http://' + uri;
        }
        return url.parse(uri);
    }

    isPathOnly(uri) {
        return uri[0] === '/';
    }

    containsProtocol(uri) {
        return uri.includes('://');
    }

    parseHeaderSectionLine (line) {
        if (this.isCommentLine(line)) {
            // No-op
        } else if (this.isQueryLine(line)) {
            this.parseQueryLine(line);
        } else if (this.isOptionLine(line)) {
            this.parseOptionLine(line);
        } else {
            this.parseHeaderLine(line);
        }
    }

    isCommentLine(line) {
        return beginsWith(line, ['#', '//']);
    }

    isQueryLine(line) {
        return beginsWith(line, ['?', '&']);
    }

    parseQueryLine(line) {
        // Query parameter
        line = line.slice(1).trim();
        let separator = earliestSubstring([':','='], line);
        if (separator) {
            let words = line.split(separator);
            let key = words[0].trim();
            this.query[key] = words.slice(1).join(separator).trim();
        } else {
            this.query[line] = '';
        }
    }

    isOptionLine(line) {
        return line.charAt(0) == '@';
    }

    parseOptionLine(line) {
        // Query parameter
        line = line.slice(1).trim();
        let separator = earliestSubstring([':','='], line);
        if (separator) {
            let words = line.split(separator);
            let key = words[0].trim();
            let value = words.slice(1).join(separator).trim();
            try {
                value = JSON.parse(value);
            } catch (e) {
                // Do nothing. Retain unparsed value.
            }
            this.setResultOption(key, value);
        } else {
            this.setResultOption(line, true);
        }
    }

    setResultOption(key, value) {
        switch (key) {
            case 'protocol':
                this.result.options[key] = normalizeProtocol(value);
                break;
            case 'auth':
            case 'hostname':
            case 'port':
                this.result.options[key] = value;
                break;
            default:
                this.result.configuration[key] = value;
        }
    }

    parseHeaderLine(line) {
        let words = line.split(':');
        if (words.length > 1) {
            let key = words[0].trim();
            this.result.options.headers[key] = words.slice(1).join(':').trim();
        }
    }

    setConfiguration(configuration) {
        let userConfiguration = configuration || {};
        this.configuration = {};
        let properties = Object.keys(userConfiguration);
        for (let i = 0; i < properties.length; ++i) {
            let property = properties[i];
            this.configuration[property] = userConfiguration[property];
        }
    }

    parsedRequestLine() {
        return !!this.result.options.method;
    }

    parseBody(lines) {
        lines.reverse();
        let body = lines.join('\n').trim();
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
                this.result.options.headers['Content-length'] = ''
                  + Buffer.byteLength(this.result.body, 'utf8')
            }
        }
    }

    isForm() {
        return this.result.configuration.form === true;
    }

    parseForm(body) {
        let formParser = new FormParser(this.configuration);
        return formParser.parse(body);
    }
}

// -----------------------------------------------------------------------------

class FormParser {

    constructor(configuration) {
        this.setConfiguration(configuration);
        this.fields = {};
        this.multilineInProgress = false;
        this.multilineValue = null;
        this.multilineKey = null;
    }

    setConfiguration(configuration) {
        let userConfiguration = configuration;
        this.configuration = {
            multilineStart: '"""',
            multilineEnd: '"""'
        };
        let properties = Object.keys(userConfiguration);
        for (let i = 0; i < properties.length; ++i) {
            let property = properties[i];
            this.configuration[property] = userConfiguration[property];
        }
    }

    parse(body) {
        // Split the string into an array of lines and reverse so that we can pop
        // lines off the stack and read them in order.
        let lines = body.split('\n');
        lines.reverse();
        while (lines.length > 0) {
            let line = lines.pop();
            this.parseLine(line);
        }
        return querystring.stringify(this.fields);
    }

    parseLine(line) {
        if (this.multilineInProgress) {
            this.parseMultilineField(line);
        } else {
            this.parseField(line);
        }
    }

    isCommentLine(line) {
        return beginsWith(line, ['#', '//']);
    }

    parseField(originalLine) {
        // Trim left-side only as the right is needed to multiline fields.
        let line = originalLine.trimLeft();
        if (this.isCommentLine(line)) {
            return; // no-op
        }
        let key, pos, separator, value, words;
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
    }

    parseMultilineField(line) {
        if (this.isEndOfMultilineField(line)) {
            this.completeMultilineField(line);
        } else {
            this.continueMultilineField(line);
        }
    }

    isEndOfMultilineField(line) {
        return line.indexOf(this.configuration.multilineEnd) !== -1;
    }

    continueMultilineField(line) {
        this.multilineValue += '\n' + line;
    }

    completeMultilineField(line) {
        let pos = line.indexOf(this.configuration.multilineEnd);
        this.fields[this.multilineKey] = this.multilineValue +
            '\n' + line.slice(0, pos);
        this.multilineInProgress = false;
    }
}

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
    let needle;
    for (let i = 0, u = needles.length; i < u; ++i) {
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
    let minPosition = haystack.length;
    let position, minNeedle = undefined;
    needles.forEach((needle) => {
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
    let parsed, properties, query, queryString;
    // Return the original path if the query to merge is empty.
    if (Object.keys(newQuery).length === 0) {
        return path;
    }
    // Parse the original path.
    parsed = url.parse(path, true);
    // Merge the queries to form a new query.
    query = parsed.query;
    properties = Object.keys(newQuery);
    for (let i = 0, u = properties.length; i < u; ++i) {
        let property = properties[i];
        query[property] = newQuery[property];
    }
    queryString = querystring.stringify(query);
    path = parsed.pathname + '?' + queryString;
    return path;
}

function valueForCaseInsensitiveKey(object, key) {
    let normalKey = key.toLowerCase();
    let keys = Object.keys(object);
    for (let i = 0; i < keys.length; ++i) {
        let originalKey = keys[i];
        if (originalKey.toLowerCase() === normalKey) {
            return object[originalKey];
        }
    }
}

// -----------------------------------------------------------------------------

module.exports = Parser;
