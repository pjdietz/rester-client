'use strict';

function Client() {

}

Client.prototype.request = function () {
    return new Request();
};

// -----------------------------------------------------------------------------

function Request() {
    this.response = new Response();
}

Request.prototype.on = function (event, callback) {
    this.onResponse = callback;
};

Request.prototype.send = function () {
    this.onResponse.call(this);
};

// -----------------------------------------------------------------------------

function Response() {

}

Response.prototype.toString = function () {
    return 'HTTP/1.1 200 OK' +
        'Content-type: text/plain' +
        '' +
        'Hello, world!';
};

// -----------------------------------------------------------------------------

module.exports = Client;
