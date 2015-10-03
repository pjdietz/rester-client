#! /usr/bin/env node

var App = require("../lib/app").App;

var app = new App();
app.on("error", function (message) {
    console.log(message);
    process.exit(1);
});
app.run();
