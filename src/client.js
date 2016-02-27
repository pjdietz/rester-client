'use strict';

var Parser = require('./parser'),
    Transaction = require('./Transaction');

function Client() {
    this.parser = new Parser();
}

Client.prototype.request = function (requestString) {
    var opts = this.parser.parse(requestString);
    return new Transaction(
        opts.options,
        opts.body,
        opts.configuration
    );
};

// -----------------------------------------------------------------------------

module.exports = Client;
