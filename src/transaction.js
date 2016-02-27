'use strict';

var EventEmitter = require('events').EventEmitter,
    http = require('http'),
    https = require('https'),
    util = require('util');

function Transaction(requestOptions, requestBody, configuration) {
    EventEmitter.call(this);
    this.requestOptions = requestOptions;
    this.requestBody = requestBody;
    this.configuration = configuration;
    this.requests = [];
    this.responses = [];
    this.requestFormatter = new RequestFormatter();
    this.responseFormatter = new ResponseFormatter();
}

util.inherits(Transaction, EventEmitter);

Transaction.prototype.send = function () {
    var _this = this;

    this.requests.push(this.requestFormatter.format(
        this.requestOptions,
        this.requestBody
    ));

    var request = http.request(this.requestOptions, function (response) {
        var body = '';
        response.setEncoding('utf8');
        response.on('data', function (chunk) {
            body += chunk;
        });
        response.on('end', function () {
            _this.emit('response');
            _this.emit('end');
            _this.responses.push(_this.responseFormatter.format(response, body));
        });
    });
    request.end();
    this.emit('request');
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
