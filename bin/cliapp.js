#! /usr/bin/env node
var yargs = require("yargs");

console.log(yargs.parse(process.argv.slice(2)));

//var argv = require("yargs").argv;
//process.argv.slice(2).forEach(function (val, index, array) {
//  console.log(index + ': ' + val);
//});

// function readStdIn(callback) {
//     var called = false, data = "", finish = function (content) {
//         if (!called) {
//             process.stdin.pause();
//             callback(content);
//             called = true;
//         }
//     };
//     process.stdin.on("error", function () {
//         finish();
//     });
//     process.stdin.on("end", function () {
//         //finish(data);
//     });
//     process.stdin.on("readable", function () {
//         var chunk = this.read();
//         if (chunk === null) {
//             finish(data);
//         } else {
//            data += chunk;
//         }
//     });
// }
//
// readStdIn(function (fromStdIn) {
//     console.log(fromStdIn);
//     console.log(fromStdIn.length);
//     //console.log(argv);
// });
