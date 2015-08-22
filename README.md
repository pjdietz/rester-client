# RESTer Core

This package includes the core functionality for RESTer, a library for making HTTP requuests from a text file or string.

## Tests

To run tests:

```bash
npm test
```

To run tests with coverages:

```bash
npm install -g istanbul
istanbul cover _mocha -- -R spec
open coverage/lcov-report/index.html
```

## Documentation

To generate documentation:

```bash
grunt jsdoc
open doc/index.html
```
