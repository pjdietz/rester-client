# RESTer Client

[![Travis](https://img.shields.io/travis/pjdietz/rester-client.svg?style=flat-square)](https://travis-ci.org/pjdietz/rester-client)
[![Coveralls](https://img.shields.io/coveralls/pjdietz/rester-client.svg?style=flat-square)](https://coveralls.io/r/pjdietz/rester-client)
[![GitHub license](https://img.shields.io/github/license/pjdietz/rester-client.svg?style=flat-square)](LICENSE.md)

RESTer Client is a library for making HTTP requests from strings. It's the core of the [RESTer Atom package](https://github.com/pjdietz/rester-atom).

## Overview

Using RESTer Client involves creating a `Client`, and then using that `Client` to generate `Transactions`. Each `Transaction` represents a single request-response cycle, including redirects.

```javascript
// Import the Client constructor.
const Client = require('rester-client');

// Create a Client instance.
let client = new Client();

// Use the Client to create a Transaction for a specific request.
let transaction = client.request(`
POST /cats/ HTTP/1.1
Host: localhost:8080
Content-type: application/json

{
    "name": "Molly",
    "color": "calico"
}
`);

// Add event listeners for transaction events.
transaction.on('end', () => {
    // Display the last response received.
    console.log(transaction.getResponse());
    // Clean up when done.
    transaction.removeAllListeners();
    transaction = null;
});

transaction.on('error', (err) => {
    console.log('Oh noez! Something went wrong!');
    // Clean up when done.
    transaction.removeAllListeners();
    transaction = null;
});

// Send the request.
transaction.send();
```

## Client

The `'rester-client'` module provides the `Client` constructor function. A `Client` instance serves as a factory for creating [`Transactions`](#transactions). To create a [`Transaction`](#transactions), pass a string to the client's `request()` method. See [Parsing](#parsing) for information on how to write requests.

When you a create `Client` instance, you can pass an optional configuration object to tailor the client's behavior to your needs.

To create a client that will follow redirects for status codes 301, 302, and 303:

```javascript
let client = new Client({
    followRedirects: true,
    redirectStatusCodes: [301, 302, 303]
});
```

### Options

| Option              | Type      | Default | Description                                                                                                     |
|:--------------------|:----------|:--------|:----------------------------------------------------------------------------------------------------------------|
| followRedirects     | `boolean` | `false` | When `true`, will automatically redirect responses with status codes listed in `redirectStatusCodes`.           |
| redirectStatusCodes | `array`   | `[]`    | When `followRedirects` is `true`, will automatically redirect responses with status codes listed in this array. |
| multilineEnd        | `string`  | `"""`   | Delimiter marking the end of a multiline form field                                                             |
| multilineStart      | `string`  | `"""`   | Delimiter marking the start of a multiline form field                                                           |


These and many other settings can be overridden when parsing the request. See the [Parsing](#parsing) section for details.

## Transactions

A `Transaction` represents a single request-response cycle. To create a `Transaction`, pass a string representing the request to a `Client`'s `request()` method.

```javascript
let transaction = client.request('GET http://localhost:8080/path');
```

Next, add event listeners. `'end'` and `'error'` are the most commonly used.

```javascript
transaction.on('end', () => {
    console.log('We received a response. Here it is:');
    console.log(transaction.getResponse());
    // Clean up when done.
    transaction.removeAllListeners();
    transaction = null;
});
transaction.on('error', (err) => {
    console.log('Oh noez! Something went wrong!');
    // Clean up when done.
    transaction.removeAllListeners();
    transaction = null;
});
```

Call `send()` to send the request.

```javascript
transaction.send();
```

### Events

| Event        | Description                                              |
|:-------------|:---------------------------------------------------------|
| `'request'`  | Send an outgoing request                                 |
| `'response'` | Received an incoming response                            |
| `'redirect'` | Sent an additional request                               |
| `'end'`      | Received a final response                                |
| `'error'`    | Encountered an error. The error is passed as a parameter |

### Methods

| Method          | Description                                               |
|:----------------|:----------------------------------------------------------|
| `getRequest()`  | Returns the initial request as a `string`                 |
| `getResponse()` | Returns the most recently received response as a `string` |
| `send()`        | Send the initial request to begin the transaction         |

See [EventEmitter](https://nodejs.org/api/events.html#events_class_eventemitter) documentation for information on adding and removing event listeners.

### Properties

| Property      | Type     | Description                                                                       |
|:--------------|:---------|:----------------------------------------------------------------------------------|
| configuration | `object` | Object of configuration options propagated from the Client or set in the request. |
| requests      | `array`  | Array of `string` requests sent.                                                  |
| responses     | `array`  | Array of `string` responses received.                                             |

## Parsing

The string you use to create a transaction can be as simple as a URI:

```
http://localhost:8080/path
```

Or, you can send headers and a body:

```
PUT /my-endpoint HTTP/1.1
Host: api.my-example-site.com
Accept: text/plain
Accept-Charset: utf-8
X-custom-header: whatever you want

Here is the payload for the PUT request. The body is anything that follows the first empty line.
```

### The Request Line

The first non-empty, non-comment (`//` or `#`) line is the "request line". RESTer parses this to determine the method, URI, and protocol.

You may include the hostname in the request line, but RESTer does not require it. If omitted, be sure to include a Host header.

Here are some example request lines (some with Host headers):

```
GET /my-endpoint HTTP/1.1
Host: api.my-example-site.com
```

```
GET /my-endpoint
Host: api.my-example-site.com
```

```
GET http://api.my-example-site.com/my-endpoint
```

```
http://api.my-example-site.com/my-endpoint
```



### Headers

RESTer parses the lines immediately following the request line up to the first empty line as headers. Use the standard field-name: field-value format.

```
GET /path HTTP/1.1
Host: localhost:8080
Cache-control: no-cache
If-Modified-Since: Mon, 8 Sept 2014 13:0:0 GMT
```

### Query Parameters

For requests with many query parameters, you may want to spread your query across a number of lines. RESTer will parse any lines in the headers section that begin with `?` or `&` as query parameters. You may use `=` or `:` to separate the key from the value.

The following example requests are equivalent:

All in the URI:

```
http://api.my-example-site.com/?cat=molly&dog=bear
```

With new lines:

```
http://api.my-example-site.com/
?cat=molly
&dog=bear
```

Indented, using colons, and only using `?`:

```
http://api.my-example-site.com/
    ? cat: molly
    ? dog: bear
```

Percent Encoding

RESTer assumes that anything you place directly in the request line is the way you want it, but query parameters added on individual lines are assumed to be in plain text. So, values of query parameters added on individual lines will be percent encoded.

These requests are equivalent:

```
http://api.my-example-site.com/?item=I%20like%20spaces
```

```
http://api.my-example-site.com/
    ? item: I like spaces
```



### Comments

Include comments in your request by adding lines in the headers section that begin with `#` or `//`. RESTer will ignore these lines.

```
GET /my-endpoint HTTP/1.1
Host: /api.my-example-site.com
# This is a comment.
// This is also a comment.
Cache-control: no-cache
```

### Body

To supply a message body for POST and PUT requests, add an empty line after the last header. RESTer will treat all content that follows the blank line as the request body.

Here's an example of adding a new cat representation by supplying JSON:

```
POST http://api.my-example-site.com/cats/
Content-type: application/json

{
    "name": "Molly",
    "color": "Calico",
    "nickname": "Mrs. Puff"
}
```

#### Forms

To submit a form (i.e., `application/x-www-form-urlencoded`), include the `@form` option in the header section. This option instructs RESTer to add the appropriate `Content-type` header and encode the body as a form.

Include the key-value pairs on separate lines. You may use `=` or `:` to separate the key from the value. As with query parameters, whitespace around the key and value is ignored.

Examples:

```
POST http://api.my-example-site.com/cats/
@form

name=Molly
color=Calico
nickname=Mrs. Puff
```

```
POST http://api.my-example-site.com/cats/
@form

      name: Molly
     color: Calico
  nickname: Mrs. Puff
```

#### Multiline Values

Use delimiters to mark the boundaries of multiline field values. By default, the delimiters are `"""`. You may customize these providing `multilineStart` and `multilineEnd` options when calling the `Client` constructor.

Here's an example of a request using mixed single- and multiline fields.

```
POST http://api.my-example-site.com/cats/
@form

name: Molly
color: Calico
nickname: Mrs. Puff
extra: """{
    "id": 2,
    "description": "This JSON snippet is wrapped in delimiters because it has multiple lines."
}"""
```

### Options

To customize RESTer's behavior for a single transaction, include options in the header section. An option begins with `@` and may or may not include a value. For example, to instruct RESTer to follow redirects, include `@followRedirects` like this:

```
GET http://localhost:8080/path-that-redirects
@followRedirects: true
```

Boolean `true` options can also be expressed with a shorthand syntax by including the option key without the `:` and value. This is equivalent:

```
GET http://localhost:8080/path-that-redirects
@followRedirects
```

Some options accept strings or arrays as values. For example:

```
GET http://localhost:8080/path-that-redirects
@followRedirects
@redirectStatusCodes: [301, 302]
```

The following is a list of options that RESTer expects:

| Option               | Type    | Description                                                                |
|:---------------------|:--------|:---------------------------------------------------------------------------|
| @auth                | string  | Auth segment for the request (e.g., "user", "user:password")               |
| @followRedirects     | boolean | Allow RESTer to automatically follow redirects                             |
| @form                | boolean | Parse the body as a form and include the appropriate `Content-type` header |
| @hostname            | string  | Hostname for the request (e.g., "localhost")                               |
| @port                | int     | Port for the request (e.g., 8080)                                          |
| @protocol            | string  | Protocol for the request. Must be "http" or "https"                        |
| @redirectStatusCodes | array   | List of status codes to automatically follow redirects for                 |

All configuration options—including those provided by the Client and those parsed from the request string—are made available as the transaction's `configuration` property. This even includes unexpected options with no inherent meaning to the core RESTer module. This feature allows you to create your own options when building software that uses RESTer Client.

For example, [RESTer for Atom](https://github.com/pjdietz/rester-atom) allows the user to customize whether or not to display redirect responses in the output by including `@showRedirects` in the request.



## Unit Tests

Run all tests:

```bash
npm test
```

Run a test or directory of tests:

```bash
npm test -- [path to file or directory relative to test/tests]
```

To run tests with code coverage, include the `-c` or `--coverage` option.

```bash
npm test -- -c [path]
npm test -- --coverage [path]
```

The code coverage report will be created at `coverage/lcov-report/index.html`.

## Author

**PJ Dietz**

- [http://pjdietz.com](http://pjdietz.com)
- [http://github.com/pjdietz](http://github.com/pjdietz)
- [http://twitter.com/pjdietz](http://twitter.com/pjdietz)

## Copyright and license

Copyright 2016 by PJ Dietz

[MIT License](LICENSE)
