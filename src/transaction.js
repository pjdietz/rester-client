'use strict';

var EventEmitter = require('events').EventEmitter,
    http = require('http'),
    https = require('https'),
    util = require('util');

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
    for (var i = 0; i < redirectCodes.length; ++i) {
        if (response.statusCode === redirectCodes[i]) {
            return true;
        }
    }
    return false;
};

Transaction.prototype.tryToRedirect = function (response) {

    // TODO Need to parse the location. If it is relative, we need to reference
    // the request used to get this response.

    var previous = this.currentRequestOptions;

    var request = {
        method: 'GET',
        hostname: previous.hostname,
        port: previous.port,
        path: response.headers.location
    };

    this.sendRequest(request);
    this.redirectCount += 1;
    this.emit('redirect');
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
