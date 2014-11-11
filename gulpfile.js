/*
 * Copyright (C) 2014 Scott Beck, all rights reserved
 *
 * Licensed under the MIT license
 *
 */
(function () {
  'use strict';
  var path = require('path');
  var gulp = require('gulp');
  var _ = require('lodash');
  var $ = require('gulp-load-plugins')();
  var opn = require('opn');
  var del = require('del');
  var pkg = require('./package.json');

  var lintSrc  = ['./index.js', './gulpfile.js', 'test/**/*.js'];
  var annoSrc  = lintSrc.concat('resources/*.*');
  var testSrc  = ['test/*helper.js', 'test/*spec.js'];
  var annoOpt  = {
    highlight:         'code-prettify',
    SyntaxHighlighter: {style: 'Emacs'},
    CodePrettify:      {style: ''},
    HighlightJS:       {style: 'googlecode'},
    templateOpt:       { pkg: pkg }
  };

  function runCoverage (opts) {
    return gulp.src(testSrc, { read: false })
      .pipe($.coverage.instrument({
        pattern: ['./index.js'],
        debugDirectory: 'debug'}))
      .pipe($.plumber())
      .pipe($.mocha({reporter: 'dot'})
            .on('error', function () { this.emit('end'); })) // test errors dropped
      .pipe($.plumber.stop())
      .pipe($.coverage.gather())
      .pipe($.coverage.format(opts));
  }

  gulp.task("clean", function (done) {
    del(["coverage.html", "debug/**/*", "debug", "dist/*", "dist"], done);
  });

  gulp.task("lint", function () {
    return gulp.src(lintSrc)
      .pipe($.jshint())
      .pipe($.jshint.reporter(require('jshint-table-reporter')));
  });

  gulp.task('coveralls', ['clean'], function () {
    return runCoverage({reporter: 'lcov'})
      .pipe($.coveralls());
  });

  gulp.task('coverage', ['clean'], function () {
    return runCoverage({outFile: './coverage.html'})
      .pipe(gulp.dest('./'))
      .on('end', function () {
        opn('./coverage.html');
      });
  });

  gulp.task("annotate", ['test'], function (done) {
    var annotate = require('./index.js');
    var through2 = require('through2');
    var File = $.util.File;
    var Buffer = require('buffer').Buffer;
    var files = [];
    gulp.src(annoSrc, { read: false })
      .pipe($.annotate('index.html', annoOpt))
      .pipe(gulp.dest('dist')
        .on('end', function () {
          done();
          //opn('./dist/index.html');
        }));
  });

  gulp.task("test", ['clean', 'lint'], function () {
    return gulp.src(testSrc, { read: false })
      .pipe($.plumber())
      .pipe($.mocha({reporter: 'spec', globals: ['expect', 'should']})
           .on('error', function () { this.emit('end'); }))
      .pipe($.plumber.stop());
  });

  gulp.task("watch", function () {
    gulp.watch(lintSrc, ['test', 'annotate']);
  });

  gulp.task("default", ["test"]);
})();
