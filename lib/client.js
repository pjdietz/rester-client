/* jshint node: true */
"use strict";

var EventEmitter = require("events").EventEmitter,
    util = require("util"),
    http = require("http"),
    https = require("https"),
    Parser = require("./parser").Parser,
    Client;

/**
 * @constructor
 */
function Client(options) {
    options = options || {};
    EventEmitter.call(this);

    this.parser = new Parser();
}

util.inherits(Client, EventEmitter);

Client.prototype.request = function (request, configuration) {

    var client = this,
        rqst, body;

    // Parse the request with the parser.
    this.parser.parse(request, configuration, function (options, stream) {
        rqst = options;
        body = rqst;

        // Make the initial request using the parsed information.
        client.startRequest(rqst, body, configuration);
    });
};

Client.prototype.getRequest = function (options, callback) {
    if (options.protocol === "https") {
        return https.request(options, callback);
    }
    return http.request(options, callback);
};

Client.prototype.startRequest = function (options, body, configuration) {
    var client = this,
        request;

    request = this.getRequest(options, function (response) {
        client.emit("response", response);
    });
    request.end();
};

exports.Client = Client;
