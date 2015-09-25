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
function App(args, outputStream) {
    EventEmitter.call(this);
    this.encoding = "utf8";
    this.eof = "\n";
    this._argv = args || process.argv.slice(2);
    this._output = outputStream || process.stdout;
    this._client = new Client();
    this._parser = new Parser();
}

util.inherits(App, EventEmitter);

App.prototype.run = function () {
    this._output.setEncoding = this.encoding;
    this._readArgs();
};

App.prototype._readArgs = function () {
    var app = this,
        args = yargs.parse(this._argv),
        request,
        stat;

    this.options = {};

    // Read the options.
    if (args.h) {
        this.options.outputHeaders = true;
    } else if (args.H) {
        this.options.outputHeaders = false;
    }

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
    this._parser.parse(request, function (error, options, body) {
        app._makeRequest(options, body);
    });
};

App.prototype._makeRequest = function (options, body) {
    var app = this;
    this._client.on("response", function (response, willRedrect) {
        if (!willRedrect) {
            response.on("end", function () {
                app.emit("end");
                app = null;
            });
            app._writeResponse(response);
        }
    });
    this._client.request(options, body);
};

App.prototype._writeResponse = function (response) {
    var stream = this._output,
        headers,
        headerLines,
        statusLine,
        i, u;

    if (this.options.outputHeaders) {
        statusLine = [
            "HTTP/" + response.httpVersion,
            response.statusCode,
            response.statusMessage
        ].join(" ");

        headerLines = [statusLine, "\r\n"];
        for (i = 0, u = response.rawHeaders.length; i < u; ++i) {
            headerLines.push(response.rawHeaders[i]);
            headerLines.push(i % 2 === 0 ? ": " : "\r\n");
        }
        headerLines.push("\r\n");
        headers = headerLines.join("");

        stream.write(headers, this.encoding, function () {
            response.pipe(stream);
        });
    } else {
        response.pipe(stream);
    }
};

exports.App = App;
