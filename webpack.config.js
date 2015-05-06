var path = require("path");
module.exports = {
    cache: true,
    entry: {
        example_words: "./examples/words/index"
    },
    output: {
        path: path.join(__dirname, "dist"),
        publicPath: "dist/",
        filename: "[name].js"
    },
    module: {
        loaders: [
            { test: /\.js$/,    loader: "babel-loader" }
        ]
    }
};
