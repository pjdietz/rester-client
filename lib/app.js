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
        commands,
        encoding = this.encoding,
        input,
        output = this._output,
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

    // The first command will read from the response.
    input = response;

    // Split the command by pipe (|)
    commands = pipeResponse.split("|");

    commands.forEach(function (command, index, arr) {
        var tokens = App.tokenizeCommand(command),
            child = spawn(tokens[0], tokens.slice(1));
        // Pipe the current input to the child process.
        input.pipe(child.stdin);
        if (index === arr.length - 1) {
            // Pipe the output from the last child to the App's output.
            child.stdout.pipe(output);
        } else {
            // Store this stream to the input variable for the next process.
            input = child.stdout;
        }
    });
};

App.tokenizeCommand = function (command) {
    // Split the command into words and quotes segements.
    var tokens = command.match(/([^'"\s]+)|\'([^']+)\'|\"([^"]+)\"/g);
    tokens.forEach(function (token, index, arr) {
        // Strip boundary quotes.
        token = token.replace(/"(.+)"/g, '$1');
        token = token.replace(/'(.+)'/g, '$1');
        arr[index] = token;
    });
    return tokens;
};

exports.App = App;
