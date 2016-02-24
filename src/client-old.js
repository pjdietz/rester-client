'use strict';

var EventEmitter = require('events').EventEmitter,
    http = require('http'),
    https = require('https'),
    util = require('util');

var Client;

// -----------------------------------------------------------------------------

function Client(options) {
    EventEmitter.call(this);
    this.storeOptions(options);
    this.redirectCount = 0;
}

util.inherits(Client, EventEmitter);

Client.prototype.storeOptions = function (options) {
    var mergedOptions = this.mergeOptionsWithDefaults(options);
    this.followRedirects = mergedOptions.followRedirects;
    this.redirectStatusCodes = mergedOptions.redirectStatusCodes;
    this.redirectLimit = mergedOptions.redirectLimit;
};

Client.prototype.mergeOptionsWithDefaults = function (options) {
    var defaults = {
        followRedirects: true,
        redirectLimit: 10,
        redirectStatusCodes: [300, 301, 302, 303, 307]
    };
    return mergeObjects(defaults, options);
};

Client.prototype.request = function (options, body) {
    // TODO Ensure client it not already making a request.
    this.redirectCount = 0;
    // Make the initial request.
    this.startRequest(options, body);
};

Client.prototype.startRequest = function (options, body) {
    var _this = this,
        request;

    options.protocol = this.normalizeProtocol(options.protocol);
    this.emit('request', options);
    request = this.createRequest(options, function (response) {
        _this.onResponse(response, options);
    });
    request.on('error', function (e) {
        _this.emit('error', e);
    });

    if (body) {
        body.pipe(request);
    } else {
        request.end();
    }
};

Client.prototype.normalizeProtocol = function (protocol) {
    if (protocol && !protocol.endsWith(':')) {
        return protocol += ':';
    }
    return protocol;
};

Client.prototype.createRequest = function (options, callback) {
    if (options.protocol === 'https:') {
        return https.request(options, callback);
    } else {
        return http.request(options, callback);
    }
};

Client.prototype.onResponse = function (response, options) {
    if (this.shouldRedirect(response)) {
        this.tryToRedirect(response, options);
    } else {
        this.emit('response', response, false);
    }
};

Client.prototype.shouldRedirect = function (response) {
    if (!this.followRedirects) {
        return false;
    }
    for (var i = 0; i < this.redirectStatusCodes.length; ++i) {
        if (response.statusCode === this.redirectStatusCodes[i]) {
            return true;
        }
    }
    return false;
};

Client.prototype.tryToRedirect = function (response, options) {
    if (this.redirectCount >= this.redirectLimit) {
        this.emit('error', new Error('Redirect limit reached'));
    } else {
        this.emit('response', response, true);
        this.redirectCount += 1;
        this.redirect(response, options);
    }
};

Client.prototype.redirect = function (response, options) {
    var properties,
        property,
        redirectOptions = {},
        i, u;

    properties = Object.keys(options);
    for (i = 0, u = properties.length; i < u; ++i) {
        property = properties[i];
        redirectOptions[property] = options[property];
    }
    // TODO Parse location for path and protocol.
    redirectOptions.method = 'GET';
    redirectOptions.path = response.headers.location;
    this.startRequest(redirectOptions, undefined);
};

// -----------------------------------------------------------------------------

function mergeObjects() {
    var merged = {},
        sources = [].slice.call(arguments, 0);
    sources.forEach(function (source) {
        for (var prop in source) {
            merged[prop] = source[prop];
        }
    });
    return merged;
}

// -----------------------------------------------------------------------------

exports.Client = Client;
