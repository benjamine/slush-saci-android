
var expect = require('expect.js');

var gulp = require('gulp');
var slushfile = require('../slushfile');

describe('slush-saci-android generator', function() {
  it('should register default gulp task', function() {
    expect(gulp.tasks.default.name).to.be('default');
  });
});
