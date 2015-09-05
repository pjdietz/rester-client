/* jshint node: true */
"use strict";

var EventEmitter = require("events").EventEmitter,
    util = require("util"),
    http = require("http"),
    https = require("https"),
    Requester;

/**
 * @constructor
 */
function Requester(options) {
    options = options || {};
    EventEmitter.call(this);

    if (options.protocol === "https") {
        this.getRequest = https.request;
    }
}

util.inherits(Requester, EventEmitter);

Requester.prototype.request = function (rqstOptions, body) {

    var clientRequest, that;

    that = this;
    clientRequest = this.getRequest(rqstOptions, function (response) {
        that.emit("response", response);
    });

    // TODO Write body
    clientRequest.end();

};

Requester.prototype.getRequest = http.request;

exports.Requester = Requester;
