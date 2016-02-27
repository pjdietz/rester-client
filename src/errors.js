'use strict';

var util = require('util');

function RedirectError(message, extra) {
    Error.captureStackTrace(this, this.constructor);
    this.name = this.constructor.name;
    this.message = message;
    this.extra = extra;
}

util.inherits(RedirectError, Error);

module.exports = {
    RedirectError: RedirectError
};
