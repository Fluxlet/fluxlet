/* global module, require, __dirname */

module.exports = function () {

  // Preprocessor to transpile imports/exports and possibly other ES6 elements
  var babelPreprocessor = file => require('babel')
                                    .transform(file.content, {sourceMap: true})

  return {
    files: [
      // system.js and configuration
      {pattern: 'jspm_packages/system.js', instrument: false},
      {pattern: 'config.js', instrument: false},

      // source files (`load: false` as the files will be loaded by system.js loader)
      {pattern: 'src/*.js', load: false}
    ],
    tests: [
      // test files (`load: false` as we will load tests manually)
      {pattern: 'test/*.js', load: false}
    ],

    preprocessors: {
      'test/*.js': babelPreprocessor,
      'src/*.js': babelPreprocessor
    },

    // telling wallaby to serve jspm_packages project folder
    // as is from wallaby web server
    middleware: (app, express) => {
      app.use('/jspm_packages',
              express.static(
                 require('path').join(__dirname, 'jspm_packages')))
    },

    bootstrap: function (wallaby) {
      // Polyfill bind for PhantomJS 1.x
      if (!Function.prototype.bind) {
        Function.prototype.bind = function(oThis) {
          if (typeof this !== 'function') {
            // closest thing possible to the ECMAScript 5
            // internal IsCallable function
            throw new TypeError('Function.prototype.bind - what is trying to be bound is not callable')
          }

          var aArgs   = Array.prototype.slice.call(arguments, 1),
            fToBind = this,
            fNOP    = function() {},
            fBound  = function() {
              return fToBind.apply(this instanceof fNOP && oThis
                  ? this
                  : oThis,
                aArgs.concat(Array.prototype.slice.call(arguments)))
            }

          // test this.prototype in case of native functions binding:
          if (this.prototype)
            fNOP.prototype = this.prototype
          fBound.prototype = new fNOP()

          return fBound
        }
      }

      // Preventing wallaby from starting the test run
      wallaby.delayStart()

      var promises = []
      for (var i = 0, len = wallaby.tests.length; i < len; i++) {
        // loading wallaby tests
        promises.push(System['import'](wallaby.tests[i].replace(/\.js$/, '')))
      }

      // starting wallaby test run when everything required is loaded
      Promise.all(promises).then(function () {
        wallaby.start()
      })
    },

    env: {
      type: 'browser'
    },

    debug: true
  }
}
