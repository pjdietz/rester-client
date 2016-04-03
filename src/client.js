'use strict';

const Parser = require('./parser');
const Transaction = require('./transaction');

class Client {
    constructor(configuration) {
        this.configuration = configuration || {};
        this.parser = new Parser(this.configuration);
    }
    request(requestString) {
        let opts = this.parser.parse(requestString);
        return new Transaction(
            opts.options,
            opts.body,
            this.mergeConfiguration(opts.configuration)
        );
    }
    mergeConfiguration(configuration) {
        let merged = {};
        for (let key of Object.keys(this.configuration)) {
            merged[key] = this.configuration[key];
        }
        for (let key of Object.keys(configuration)) {
            merged[key] = configuration[key];
        }
        return merged;
    }
}

// -----------------------------------------------------------------------------

module.exports = Client;
