var wallabify = require('wallabify');
var wallabyPostprocessor = wallabify({});

module.exports = () => {
  return {
    files: [
      {pattern: 'src/fluxlet.js', load: false}
    //   'src/utils.js',
    //   'src/testlet-utils.js',
    //   'src/testlet.js'
    ],
    tests: [
      {pattern: 'test/fluxlet.js', load: false}
    ],
    preprocessors: {
      '**/*.js': file => require('babel')
                            .transform(file.content, {sourceMap: true}),
    },
    postprocessor: wallabyPostprocessor,

    bootstrap: function () {
      // required to trigger tests loading
      window.__moduleBundler.loadTests();
    },

    env: {
        type: 'browser'
    },
    debug: true
  };
};
