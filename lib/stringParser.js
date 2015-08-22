var EventEmitter = require("events").EventEmitter;
var stream = require("stream");
var util = require('util');

/**
 * @constructor
 */
function StringParser() {
    EventEmitter.call(this);
    this.eol = "\n";
    this.encoding = "utf8";
}

util.inherits(StringParser, EventEmitter);

/**
 * Parse a string representing an HTTP request.
 *
 * @fires StringParser#requestLine
 * @fires StringParser#header
 * @fires StringParser#body
 * @fires StringParser#end
 * @param  {string} str HTTP request
 */
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
                this.emit("requestLine", line);
                requestLine = true;
                continue;
            }
        } else {
            if (line === "") {
                // Body begins.
                lines.reverse;
                body = lines.join(this.eol);
                this.emit("body", stringToStream(body));
                break;
            } else {
                this.emit("header", line);
            }
        }
    }
    this.emit("end");
};

function stringToStream(string) {
    var s = new stream.Readable();
    //s._read = function noop() {};
    s.push(string);
    s.push(null);
    return s;
}

/**
 * The parser parsed the first non-empty line of the request.
 *
 * @event StringParser#requestLine
 * @param {string} requestLine The request line (e.g., "GET / HTTP/1.1")
 */

 /**
  * The parser parsed a header line.
  *
  * @event StringParser#header
  * @param {string} header An individual header line (e.g., "Content-type: text/plain")
  */

/**
 * The parser parsed the request entity body. This event will not fire for a
 * request that does not contain an entity body.
 *
 * @event StringParser#body
 * @param {stream.Readable} body A readable stream containing the body.
 */

 /**
  * The parser parsed reached the end of the request.
  *
  * @event StringParser#end
  */

exports.StringParser = StringParser;
