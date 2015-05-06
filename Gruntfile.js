module.exports = function(grunt) {

    require('load-grunt-tasks')(grunt);

    var webpackConfig = require("./webpack.config.js");

    grunt.initConfig({
        webpack: {
            options: webpackConfig,
            build: {},
            "build-dev": {
                devtool: "sourcemap",
                debug: true
            }
        },
        "webpack-dev-server": {
            options: {
                webpack: webpackConfig,
                publicPath: "/" + webpackConfig.output.publicPath
            },
            start: {
                keepAlive: true,
                webpack: {
                    devtool: "eval",
                    debug: true
                }
            }
        },
        watch: {
            examples: {
                files: ["examples/**/*", "src/**/*"],
                tasks: ["webpack:build-dev"],
                options: {
                    spawn: false,
                }
            }
        }
    });

    grunt.registerTask("default", ["webpack-dev-server:start"]);

    grunt.registerTask("dev", ["webpack:build-dev", "watch:examples"]);

    grunt.registerTask("build", ["webpack:build"]);
};
