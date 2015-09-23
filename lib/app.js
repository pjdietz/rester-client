/* jshint node: true */
"use strict";

var EventEmitter = require("events").EventEmitter,
    fs = require("fs"),
    util = require("util");

var yargs = require("yargs");

var Client = require("./client").Client,
    Parser = require("./parser").Parser;

var App;

// -----------------------------------------------------------------------------

/**
 * @constructor
 */
function App(options) {
    EventEmitter.call(this);
    this._argv = process.argv.slice(2);
    this._client = new Client();
    this._parser = new Parser();
}

util.inherits(App, EventEmitter);

App.prototype.run = function () {
    this._readArgs();
};

App.prototype._readArgs = function () {
    var app = this,
        args = yargs.parse(this._argv),
        request,
        stat;

    // Locate the first non-hyphenated option.
    if (args._.length >= 1) {
        request = args._[0];
        // Check if this is a file path.
        try {
            stat = fs.lstatSync(request);
            if (stat.isFile()) {
                request = fs.readFileSync(request, {
                    encoding: "utf8"
                });
                this._parseRequest(request);
            } else {
                this.emit("error", "Request path is not a file");
                return;
            }
        } catch (e) {
            // It's not a file path. Use this as the request.
            this._parseRequest(request);
        }
        return;
    }

    this.emit("error", "No request found");
};

App.prototype._parseRequest = function (request) {
    var app = this;
    this._parser.parse(request, function () {
        app.emit("end");
    });
};

exports.App = App;
