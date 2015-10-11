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
    this.options = {
        outputHeaders: false,
        outputRedirects: false
    };
    this._argv = args || process.argv.slice(2);
    this._error = false;
    this._output = outputStream || process.stdout;
    this._request = undefined;
    this._client = new Client();
    this._parser = new Parser();
}

util.inherits(App, EventEmitter);

App.prototype.run = function () {
    this._output.setEncoding = this.encoding;
    this._readArgs();
    if (this._request) {
        this._parseRequest(this._request);
    }
};

App.prototype._readArgs = function () {
    var args, request, stat;

    args = yargs.usage("Usage: $0 <request> [options]")
        .strict()
        .option("help", {
            describe: "Show this help"
        })
        .option("host", {
            describe: "Hostname or IP address to connect to",
            type: "string"
        })
        .option("port", {
            describe: "Port to connect to",
            type: "string"
        })
        .option("pipe", {
            describe: "Pipe the response through a command or commands",
            type: "string"
        })
        .option("c", {
            alias: "config",
            describe: "Path to a json configuration file",
            type: "string"
        })
        .option("h", {
            alias: "show-headers",
            describe: "Display response headers",
            type: "boolean"
        })
        .option("H", {
            alias: "hide-headers",
            describe: "Do not display response headers",
            type: "boolean"
        })
        .option("r", {
            alias: "show-redirect",
            describe: "Display redirect responses",
            type: "boolean"
        })
        .option("R", {
            alias: "hide-redirect",
            describe: "Do not display redirect responses",
            type: "boolean"
        })
        .example("$0 'GET http://localhost/path' -h", "Make a GET request to /path on localhost and show headers")
        .example("$0 ~/request.http", "Make the request stored to a file.")
        .parse(this._argv);

    // Read the options.
    if (args.help) {
        this.emit("error", yargs.help());
        return;
    }

    // Output headers
    if (args.h) {
        this.options.outputHeaders = true;
    } else if (args.H) {
        this.options.outputHeaders = false;
    }

    // Output redirects
    if (args.r) {
        this.options.outputRedirects = true;
    } else if (args.R) {
        this.options.outputRedirects = false;
    }

    // Pipe response
    if (args.pipe) {
        this.options.pipeResponse = args.pipe;
    }

    // Fail if there are no non-hyphenated options.
    if (args._.length === 0) {
        this.emit("error", "No request provided.\n" + yargs.help());
        return;
    }

    // Locate the first non-hyphenated option.
    request = args._[0];
    // Check if this is a file path.
    try {
        stat = fs.lstatSync(request);
        if (stat.isFile()) {
            this._request = fs.readFileSync(request, {
                encoding: "utf8"
            });
            return;
        } else {
            this.emit("error", "Request path is not a file.\n" + yargs.help());
            return;
        }
    } catch (e) {
        // It's not a file path. Use this as the request.
        this._request = request;
        return;
    }
};

App.prototype._parseRequest = function (request) {
    var result = this._parser.parse(request);
    this._makeRequest(result.options, result.body);
};

App.prototype._makeRequest = function (options, body) {
    var app = this;
    this._client.on("response", function (response, willRedrect) {
        if (!willRedrect) {
            // This response is the last and will not cause a redirect.
            // Pass a callback to _writeResponse to emit the app's
            // "end" event upon writing the response to the output stream.
            app._writeResponse(response, function () {
                app.emit("end");
                app = null;
            });
        } else if (app.options.outputRedirects) {
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
 * @param  {Function} callback Function to call after writing headers
 */
App.prototype._writeResponse = function (response, callback) {
    var app = this;
    if (this.options.outputHeaders) {
        this._writeResponseHeaders(response, function () {
            app._writeResponseBody(response, function () {
                if (typeof callback === "function") {
                    callback();
                }
                app = null;
            });
        });
    } else {
        this._writeResponseBody(response, callback);
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

    if (!pipeResponse) {
        response.on("end", function () {
            callback();
        });
        response.pipe(this._output, {end: false});
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
            // Call the callback when the child's stdout ends.
            child.stdout.on("end", function () {
                callback();
            });
            child.stdout.pipe(output, {end: false});
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
