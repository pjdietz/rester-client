# RESTer Client

[![Travis](https://img.shields.io/travis/pjdietz/rester-client.svg?style=flat-square)](https://travis-ci.org/pjdietz/rester-client)
[![Coveralls](https://img.shields.io/coveralls/pjdietz/rester-client.svg?style=flat-square)](https://coveralls.io/r/pjdietz/rester-client)


RESTer is a library for making HTTP requests from a text file or string.

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
