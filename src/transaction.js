'use strict';

const EventEmitter = require('events').EventEmitter;
const http = require('http');
const https = require('https');
const stream = require('stream');
const url = require('url');
const RedirectError = require('./errors').RedirectError;

// -----------------------------------------------------------------------------

class Transaction extends EventEmitter {

    /**
     * @param {Object} requestOptions
     * @param {string} requestBody
     * @param {Object} configuration
     */
    constructor(requestOptions, requestBody, configuration) {
        super();
        this.requestOptions = requestOptions;
        this.requestBody = requestBody;
        this.configuration = configuration || {};
        this.requests = [];
        this.responses = [];
        this.requestFormatter = new RequestFormatter();
        this.responseFormatter = new ResponseFormatter();
        this.redirectCount = 0;
        this.currentLocation = null;
        this.history = [];
    }

    send() {
        this.sendRequest(this.requestOptions, this.requestBody);
        this.emit('request');
    }

    sendRequest(requestOptions, body) {
        this.storeToHistory(requestOptions);
        let request = this.createClientRequest(requestOptions);
        request.on('error', (err) => {
            this.emit('error', err);
        });
        this.requests.push(this.requestFormatter.format(request, body));
        if (body) {
            let bodyStream = stringToStream(body.trim());
            bodyStream.pipe(request);
        } else {
            request.end();
        }
    }

    storeToHistory(requestOptions) {
        let options = JSON.parse(JSON.stringify(requestOptions));
        if (!options.pathname) {
            let parts =  options.path.split('?');
            options.pathname = parts[0];
            if (parts.length > 1) {
                options.search = parts[1];
            }
        }
        this.currentLocation = url.format(options);
        this.history.push(this.currentLocation);
    }

    createClientRequest(options) {
        if (options.protocol === 'https:') {
            return this.createHttpsRequest(options);
        } else {
            return this.createHttpRequest(options);
        }
    }

    createHttpRequest(options) {
        return http.request(options, (response) => {
            this.onResponse(response);
        });
    }

    createHttpsRequest(options) {
        // Allow self-signed certificates since the primary use case for RESTer
        // is testing.
        options.rejectUnauthorized = false;
        return https.request(options, (response) => {
            this.onResponse(response);
        });
    }

    onResponse(response) {
        let body = '';
        response.setEncoding('utf8');
        response.on('data', (chunk) => {
            body += chunk;
        });
        response.on('end', () => {
            this.completeResponse(response, body);
            response.removeAllListeners();
        });
    }

    completeResponse(response, body) {
        this.responses.push(this.responseFormatter.format(response, body));
        this.emit('response');
        if (this.shouldRedirect(response)) {
            this.tryToRedirect(response);
        } else {
            this.emit('end');
        }
    }

    shouldRedirect(response) {
        let redirectCodes = this.configuration.redirectStatusCodes || [];
        if (this.configuration.followRedirects) {
            for (let i = 0; i < redirectCodes.length; ++i) {
                if (response.statusCode === redirectCodes[i]) {
                    return true;
                }
            }
        }
        return false;
    }

    tryToRedirect(response) {
        let limit = this.configuration.redirectLimit;
        let resolved = this.getUrlFromCurrentLocation(response.headers.location);
        let request = url.parse(resolved);
        if (this.requestOptions.method === 'HEAD') {
            request.method = 'HEAD';
        }
        this.redirectCount += 1;
        if (this.redirectCount > limit) {
            this.emit('error', new RedirectError(`Reached redirect limit of ${limit}`));
            return;
        }
        if (this.history.indexOf(resolved) > -1) {
            this.emit('error', new RedirectError(`Redirect loop detected`));
            return;
        }
        this.sendRequest(request);
        this.emit('redirect');
    }

    getUrlFromCurrentLocation(uri) {
        return url.resolve(this.currentLocation, uri);
    }

    getRequest() {
        return this.requests[0];
    }

    getResponse() {
        return this.responses[this.responses.length - 1];
    }
}

// -----------------------------------------------------------------------------

class MessageFormatter {
    format(message, body) {
        let formatted = this.startLine(message);
        formatted += this.headerLines(message);
        if (body) {
            formatted += '\r\n';
            formatted += body;
        }
        return formatted;
    }
}

class RequestFormatter extends MessageFormatter {
    startLine(request) {
        let method = request.method;
        let path = request.path;
        return `${method} ${path} HTTP/1.1\r\n`;
    }
    headerLines(request) {
        let headerLines = '';
        let keys = Object.keys(request._headerNames);
        keys.forEach(key => {
            let name = request._headerNames[key];
            let value = request._headers[key];
            headerLines += `${name}: ${value}\r\n`;
        });
        return headerLines;
    }
}

// -----------------------------------------------------------------------------

class ResponseFormatter extends MessageFormatter {

    startLine(response) {
        let statusCode = response.statusCode;
        let reasonPhrase = response.statusMessage;
        return `HTTP/1.1 ${statusCode} ${reasonPhrase}\r\n`;
    }

    headerLines(response) {
        let headerLines = '';
        for (let i = 0; i < response.rawHeaders.length; ++i) {
            headerLines += response.rawHeaders[i];
            headerLines += (i % 2 === 0 ? ': ' : '\r\n');
        }
        return headerLines;
    }
}

// -----------------------------------------------------------------------------

function stringToStream(string) {
    let s = new stream.Readable();
    s.push(string);
    s.push(null);
    return s;
}

// -----------------------------------------------------------------------------

module.exports = Transaction;
