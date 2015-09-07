/* jshint node: true */
"use strict";

var EventEmitter = require("events").EventEmitter,
    http = require("http"),
    https = require("https"),
    util = require("util");

var Parser = require("./parser").Parser;

var Client;

// -----------------------------------------------------------------------------

/**
 * @constructor
 */
function Client(options) {
    options = options || {};
    EventEmitter.call(this);

    this.parser = new Parser();
    // Default values.
    this.followRedirects = true;
    this.redirectStatusCodes = [300, 301, 302, 303, 307];
    this.redirectLimit = 10;
    // TODO Override default values with options.
}

util.inherits(Client, EventEmitter);

Client.error = {
    REDIRECT_LIMIT_REACHED: 1
};

Client.prototype.request = function (request, configuration) {

    var client = this,
        rqst, body;

    // TODO Ensure client it not already making a request.

    // Reset the redirect count.
    this.redirectCount = 0;

    // Parse the request with the parser.
    this.parser.parse(request, configuration, function (options, stream) {
        rqst = options;
        body = stream;

        // Make the initial request using the parsed information.
        client.startRequest(rqst, body, configuration);
    });
};

Client.prototype.getRequest = function (options, callback) {
    if (options.protocol === "https" || options.protocol === "https:") {
        return https.request(options, callback);
    }
    return http.request(options, callback);
};

Client.prototype.startRequest = function (options, body, configuration) {
    var client = this,
        request,
        willRedirect = false;

    // Normalize protocol to contain a trailing :
    if (options.protocol && options.protocol.substr(options.protocol.length - 1) != ":") {
        options.protocol += ":";
    }

    request = this.getRequest(options, function (response) {
        // Redirect.
        if (client.followRedirects) {
            client.redirectStatusCodes.forEach(function (code) {
                if (code === response.statusCode) {
                    if (client.redirectCount >= client.redirectLimit) {
                        // Error: Redirect limit reached.
                        client.emit("error", Client.error.REDIRECT_LIMIT_REACHED);
                    } else {
                        willRedirect = true;
                        client.redirectCount += 1;
                        client.redirect(response, options, configuration);
                    }
                }
            });
        }
        client.emit("response", response, willRedirect);
    });
    if (body) {
        body.pipe(request);
    } else {
        request.end();
    }
};

Client.prototype.redirect = function (response, options, configuration) {
    var redirectOptions = {},
        property;
    for (property in options) {
        redirectOptions[property] = options[property];
    }
    // TODO Parse location for path and protocol.
    redirectOptions.method = "GET";
    redirectOptions.path = response.headers.location;
    this.startRequest(redirectOptions, undefined, configuration);
};

exports.Client = Client;
