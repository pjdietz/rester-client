'use strict';

const Parser = require('./parser');
const Transaction = require('./Transaction');

class Client {
    constructor() {
        this.parser = new Parser();
    }
    request(requestString) {
        let opts = this.parser.parse(requestString);
        return new Transaction(
            opts.options,
            opts.body,
            opts.configuration
        )
    }
}

// -----------------------------------------------------------------------------

module.exports = Client;
