'use strict';

var EventEmitter = require('events').EventEmitter,
    http = require('http'),
    https = require('https'),
    stream = require('stream'),
    url = require('url'),
    util = require('util');

var RedirectError = require('./errors').RedirectError;

function Transaction(requestOptions, requestBody, configuration) {
    EventEmitter.call(this);
    this.requestOptions = requestOptions;
    this.requestBody = requestBody;
    this.configuration = configuration || {};
    this.requests = [];
    this.responses = [];
    this.requestFormatter = new RequestFormatter();
    this.responseFormatter = new ResponseFormatter();
    // Things that could move into a state.
    this.redirectCount = 0;
    this.currentLocation = null;
}

util.inherits(Transaction, EventEmitter);

Transaction.prototype.send = function () {
    this.sendRequest(this.requestOptions, this.requestBody);
    this.emit('request');
};

Transaction.prototype.sendRequest = function (requestOptions, body) {
    var _this = this;
    this.currentLocation = url.format(requestOptions);
    var request = http.request(requestOptions, function (response) {
        _this.onResponse(response);
    });
    this.requests.push(this.requestFormatter.format(request, body));
    if (body) {
        var bodyStream = stringToStream(body.trim());
        bodyStream.pipe(request);
    } else {
        request.end();
    }
};

Transaction.prototype.onResponse = function (response) {
    var _this = this,
        body = '';
    response.setEncoding('utf8');
    response.on('data', function (chunk) {
        body += chunk;
    });
    response.on('end', function () {
        _this.completeResponse(response, body);
        response.removeAllListeners();
    });
};

Transaction.prototype.completeResponse = function (response, body) {
    this.responses.push(this.responseFormatter.format(response, body));
    this.emit('response');
    if (this.shouldRedirect(response)) {
        this.tryToRedirect(response);
    } else {
        this.emit('end');
    }
};

Transaction.prototype.shouldRedirect = function (response) {
    var redirectCodes = this.configuration.redirectStatusCodes || [];
    if (this.configuration.followRedirects) {
        for (var i = 0; i < redirectCodes.length; ++i) {
            if (response.statusCode === redirectCodes[i]) {
                return true;
            }
        }
    }
    return false;
};

Transaction.prototype.tryToRedirect = function (response) {
    var limit = this.configuration.redirectLimit,
        resolved = this.getUrlFromCurrentLocation(response.headers.location),
        request = url.parse(resolved);
    this.redirectCount += 1;
    if (this.redirectCount > limit) {
        this.emit('error', new RedirectError('Reached redirect limit of ' + limit));
        return;
    }
    this.sendRequest(request);
    this.emit('redirect');
};

Transaction.prototype.getUrlFromCurrentLocation = function (uri) {
    return url.resolve(this.currentLocation, uri);
};

Transaction.prototype.getRequest = function () {
    return this.requests[0];
};

Transaction.prototype.getResponse = function () {
    return this.responses[this.responses.length - 1];
};

// -----------------------------------------------------------------------------

function MessageFormatter() {}

MessageFormatter.prototype.format = function (message, body) {
    var formatted = this.startLine(message);
    formatted += this.headerLines(message);
    if (body) {
        formatted += '\r\n';
        formatted += body;
    }
    return formatted;
};

function RequestFormatter() {
    MessageFormatter.call(this);
}

// -----------------------------------------------------------------------------

util.inherits(RequestFormatter, MessageFormatter);

RequestFormatter.prototype.startLine = function (request) {
    var method = request.method,
        path = request.path,
        version = 'HTTP/1.1';
    return method + ' ' + path + ' ' + version + '\r\n';
};

RequestFormatter.prototype.headerLines = function (request) {
    var headerLines = '',
        keys = Object.keys(request._headerNames);
    keys.forEach(function (key) {
        var name = request._headerNames[key],
            value = request._headers[key];
        headerLines += name + ': ' + value + '\r\n';
    });
    return headerLines;
};

// -----------------------------------------------------------------------------

function ResponseFormatter() {
    MessageFormatter.call(this);
}

util.inherits(ResponseFormatter, MessageFormatter);

ResponseFormatter.prototype.startLine = function (response) {
    var version = 'HTTP/1.1',
        statusCode = response.statusCode,
        reasonPhrase = response.statusMessage;
    return version + ' ' + statusCode + ' ' + reasonPhrase + '\r\n';
};

ResponseFormatter.prototype.headerLines = function (response) {
    var headerLines = '';
    for (var i = 0; i < response.rawHeaders.length; ++i) {
        headerLines += response.rawHeaders[i];
        headerLines += (i % 2 === 0 ? ': ' : '\r\n');
    }
    return headerLines;
};

// -----------------------------------------------------------------------------

function stringToStream(string) {
    var s = new stream.Readable();
    s.push(string);
    s.push(null);
    return s;
}

// -----------------------------------------------------------------------------

module.exports = Transaction;
