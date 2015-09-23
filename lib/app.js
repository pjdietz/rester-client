/* jshint node: true */
"use strict";

var EventEmitter = require("events").EventEmitter,
    util = require("util");

var yargs = require("yargs");

var Parser = require("./parser").Parser;

var App;

// -----------------------------------------------------------------------------

/**
 * @constructor
 */
function App(options) {
    EventEmitter.call(this);
    this._argv = process.argv.slice(2);
    this._input = process.stdin;
    this._parser = new Parser();
}

util.inherits(App, EventEmitter);

App.defaultOptions = {
    inputStream: process.stdin
};

App.prototype.run = function () {
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
        app._readArgs(request);
        app = null;
    };

    this._input.on("end", function () {
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

App.prototype._readArgs = function (input) {
    var args = yargs.parse(this._argv),
        request;

    if (input) {
        request = input;
    } else if (args._.length >= 1) {
        request = args._[0];
    } else {
        this.emit("error", "No request found");
    }

    this._parseRequest(request);
};

App.prototype._parseRequest = function (request) {
    var app = this;
    this._parser.parse(request, function () {
        app.emit("end");
    });
};

exports.App = App;
