var EventEmitter = require("events").EventEmitter;
var stream = require("stream");

function StringParser() {
    this.emitter = new EventEmitter();
    this.eol = "\n";
    this.encoding = "utf8";
}

StringParser.prototype.parse = function (str) {

    var body, lines, line, requestLine;

    // Indicates the parse has not yet parsed the request line.
    requestLine = false;

    // Split the string into an array of lines.
    lines = str.split(this.eol);

    // Reverse the lines so we can pop them off.
    lines.reverse();

    while (lines.length > 0) {
        line = lines.pop().trim();
        if (!requestLine) {
            if (line !== "") {
                this.emitter.emit("requestLine", line);
                requestLine = true;
                continue;
            }
        } else {
            if (line === "") {
                // Body begins.
                lines.reverse;
                body = lines.join(this.eol);
                this.emitter.emit("body", stringToStream(body));
                break;
            } else {
                this.emitter.emit("headerLine", line);
            }
        }
    }

};

StringParser.prototype.on = function (event, callback) {
    this.emitter.on(event, callback);
};

function stringToStream(string) {
    var s = new stream.Readable();
    //s._read = function noop() {};
    s.push(string);
    s.push(null);
    return s;
}

exports.StringParser = StringParser;
