/*
 * slush-saci-android
 * https://github.com/benjamine/slush-saci-android
 *
 * Copyright (c) 2014, Benjamin Eidelman
 * Licensed under the MIT license.
 */

'use strict';

var gulp = require('gulp'),
    path = require('path'),
    install = require('gulp-install'),
    conflict = require('gulp-conflict'),
    template = require('gulp-template'),
    rename = require('gulp-rename'),
    gulpif = require('gulp-if'),
    _ = require('underscore.string'),
    inquirer = require('inquirer');

var binaryFileExtensions = [
  '.so',
  '.png', '.jpg', '.gif',
  '.wav', '.mp3', '.mpg', '.3gp',
  '.zip', '.tgz', '.bz2', '.gz'
];
function isTemplateFile(f) {
  // don't treat binary files as templates
  var ext = path.extname(f.name).toLowerCase();
  return binaryFileExtensions.indexOf(ext) < 0;
}

gulp.task('default', function (done) {
    var prompts = [{
        type: 'input',
        name: 'appName',
        message: 'What is the name of your app?',
        default: gulp.args.join(' ') || path.basename(path.resolve('.'))
    }, {
        type: 'input',
        name: 'appDescription',
        message: 'What is the description for your app?'
    }, {
        type: 'confirm',
        name: 'moveon',
        message: 'Continue?'
    }];
    //Ask
    inquirer.prompt(prompts,
        function (answers) {
            if (!answers.moveon) {
                return done();
            }
            answers.appNameSlug = _.slugify(answers.appName);
            gulp.src([__dirname + '/templates/**'])
                .pipe(gulpif(isTemplateFile, template(answers, {
                  // use only <%= name %> syntax, disabling ES6 interpolate
                  interpolate: /<%=([\s\S]+?)%>/g
                })))
                .pipe(rename(function (file) {
                    if (file.basename[0] === '_') {
                        file.basename = '.' + file.basename.slice(1);
                    }
                }))
                .pipe(conflict('./'))
                .pipe(gulp.dest('./'))
                .pipe(install())
                .on('end', function () {
                    done();
                });
        });
});
