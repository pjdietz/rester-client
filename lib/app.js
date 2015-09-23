/* jshint node: true */
"use strict";

var EventEmitter = require("events").EventEmitter,
    util = require("util");

var Parser = require("./parser").Parser;

var App;

// -----------------------------------------------------------------------------

/**
 * @constructor
 */
function App(options) {
    EventEmitter.call(this);
    this._input = process.stdin;
    this._parser = new Parser();
}

util.inherits(App, EventEmitter);

App.defaultOptions = {
    inputStream: process.stdin
};

App.prototype.run = function () {
    console.log("Running!");
    this._readInputStream();

};

App.prototype._readInputStream = function () {
    var app = this,
        called = false,
        data = "",
        finish;

    // Callable to be used on time only.
    finish = function (request) {
        app._input.removeAllListeners();
        app._parseRequest(request);
        app = null;
    };

    this._input.on("end", function () {
        finish(data);
    });
    this._input.on("error", function () {
        finish(data);
    });
    this._input.on("readable", function () {
        var chunk = this.read();
        if (chunk === null) {
            finish(data);
        } else {
           data += chunk;
        }
    });
};

App.prototype._parseRequest = function (request) {
    var app = this;
    this._parser.parse(request, function () {
        app.emit("end");
    });
};

exports.App = App;
