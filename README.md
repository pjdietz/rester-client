# RESTer Client

[![Travis](https://img.shields.io/travis/pjdietz/rester-client.svg?style=flat-square)](https://travis-ci.org/pjdietz/rester-client)
[![Coveralls](https://img.shields.io/coveralls/pjdietz/rester-client.svg?style=flat-square)](https://coveralls.io/r/pjdietz/rester-client)
[![GitHub license](https://img.shields.io/github/license/pjdietz/rester-client.svg?style=flat-square)](LICENSE.md)

RESTer is a library for making HTTP requests from strings. It's the core of the [RESTer Atom package](https://github.com/pjdietz/rester-atom) and may be useful for end-to-end API testing.

## Usage

```javascript
// Import the Client constructor.
const Client = require('rester-client');

// Create a Client instance.
let client = new Client();

// Use the Client to create a transaction for a specific request.
let transaction = client.request(`
POST /path HTTP/1.1
Host: localhost:8080
Content-type: application/json

{
    "name": "value"
}
`);

// Add an event to fire when the transaction completes.
transaction.on('end', () => {
    // Display the last response received including response line, headers,
    // and body.
    console.log(transaction.getResponse());
    /*
        HTTP/1.1 201 Created
        Content-type: application/json

        {
            "name": "value"
        }
     */
});

// Send the request.
transaction.send();
```

## Unit Tests

Run all tests:

```bash
npm test
```

Run a test or directory of tests:

```bash
npm test -- [path to file or directory relative to test/tests]
```

To run tests with code cover, include the `-c` or `--coverage` option.

```bash
npm test -- -c [path]
npm test -- --coverage [path]
```

The code coverage report will be created at `coverage/lcov-report/index.html`.
