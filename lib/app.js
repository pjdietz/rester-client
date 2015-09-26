/* jshint node: true */
"use strict";

var EventEmitter = require("events").EventEmitter,
    fs = require("fs"),
    spawn = require("child_process").spawn,
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
    this.eol = "\r\n";
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
    var args = yargs.parse(this._argv),
        request,
        stat;

    this.options = {};

    // Read the options.

    // Output headers
    if (args.h) {
        this.options.outputHeaders = true;
    } else if (args.H) {
        this.options.outputHeaders = false;
    }

    // Pipe response
    if (args.pipe) {
        this.options.pipeResponse = args.pipe;
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

/**
 * Output the response to the output stream.
 *
 * This method will write headers and body, depending on the configuration.
 *
 * @param  {http.IncomingMessage} response
 */
App.prototype._writeResponse = function (response) {
    var app = this;
    if (this.options.outputHeaders) {
        this._writeResponseHeaders(response, function () {
            app._writeResponseBody(response, function () {
                app = null;
            });
        });
    } else {
        this._writeResponseBody(response);
    }
};

/**
 * Output the status line and headers for a response, then call callback.
 *
 * @param  {http.IncomingMessage} response
 * @param  {Function} callback Function to call after writing headers
 */
App.prototype._writeResponseHeaders = function (response, callback) {
    var headerLines,
        headers,
        statusLine,
        i, u;

    statusLine = [
        "HTTP/" + response.httpVersion,
        response.statusCode,
        response.statusMessage
    ].join(" ");

    headerLines = [statusLine, this.eol];
    for (i = 0, u = response.rawHeaders.length; i < u; ++i) {
        headerLines.push(response.rawHeaders[i]);
        headerLines.push(i % 2 === 0 ? ": " : this.eol);
    }
    headerLines.push(this.eol);
    headers = headerLines.join("");

    this._output.write(headers, this.encoding, callback);
};

/**
 * Write the respose body to the output stream.
 *
 * If the configuration indicates a command to pipe the response body to,
 * spawn a child process to process the body before outputting.
 *
 * @param  {http.IncomingMessage} response
 * @param  {Function} callback Function to call after writing bo
 */
App.prototype._writeResponseBody = function (response, callback) {
    var args,
        child,
        command,
        pipeResponse = this.options.pipeResponse;

    response.on("end", function () {
        if (typeof callback === "function") {
            callback();
        }
    });

    if (!pipeResponse) {
        response.pipe(this._output);
        return;
    }

    args = pipeResponse.split(" ");
    command = args[0];
    child = spawn(command, args.slice(1));
    child.stdin.setEncoding(this.encoding);
    child.stdout.pipe(this._output);
    response.pipe(child.stdin);

};

exports.App = App;
