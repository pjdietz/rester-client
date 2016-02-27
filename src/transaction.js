'use strict';

var EventEmitter = require('events').EventEmitter,
    http = require('http'),
    https = require('https'),
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
    this.currentRequestOptions = null;
}

util.inherits(Transaction, EventEmitter);

Transaction.prototype.send = function () {
    this.sendRequest(this.requestOptions, this.requestBody);
    this.emit('request');
};

Transaction.prototype.sendRequest = function (requestOptions, body) {
    var _this = this;
    this.currentRequestOptions = requestOptions;
    this.requests.push(this.requestFormatter.format(requestOptions, body));
    var request = http.request(requestOptions, function (response) {
        _this.onResponse(response);
    });
    request.end();
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
    });
};

Transaction.prototype.completeResponse = function (response, body) {
    this.emit('response');
    this.responses.push(this.responseFormatter.format(response, body));
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
    var currentUrl = url.format(this.currentRequestOptions);
    return url.resolve(currentUrl, uri);
};

Transaction.prototype.getRequest = function () {
    return this.requests[0];
};

Transaction.prototype.getResponse = function () {
    return this.responses[this.responses.length - 1];
};

// -----------------------------------------------------------------------------

function MessageFormatter() {

}

function RequestFormatter() {

}

RequestFormatter.prototype.format = function (request, body) {
    return 'GET /hello HTTP/1.1';
};

function ResponseFormatter() {

}

ResponseFormatter.prototype.format = function (response, body) {
    return 'HTTP/1.1 200 OK\n' +
        '\n' +
        'Hello, world!';
};

// -----------------------------------------------------------------------------

module.exports = Transaction;
