# RESTer

RESTer is a library for making HTTP requests from a text file or string.

## Unit Tests

Run all tests:

```bash
npm test
```

Run all tests with coverage:

```bash
npm test -- -c
npm test -- --coverage
```

Run a test or directory of tests:

```bash
npm test -- [path to file or directory relative to test/]
```

Run tests with code coverage:

```bash
npm test -- -c [path]
npm test -- --coverage [path]
```

Running tests will generate a code coverage report. To view:

```bash
open coverage/lcov-report/index.html
```

## Documentation

To generate documentation and view:

```bash
grunt jsdoc
open doc/index.html
```
