module.exports = function(grunt) {

  // Project configuration.
  grunt.initConfig({
      jsdoc: {
          dist: {
              src: ["lib/*.js"],
              jsdoc: "./node_modules/.bin/jsdoc",
              options: {
                 destination: "doc",
                 configure: "./jsdoc.conf.json",
                 template: "./node_modules/ink-docstrap/template"
             }
          }
      }
  });

  grunt.loadNpmTasks("grunt-jsdoc");

};
