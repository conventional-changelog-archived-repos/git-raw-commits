'use strict';
var dargs = require('dargs');
var exec = require('child_process').exec;
var split = require('split2');
var stream = require('stream');
var template = require('lodash.template');
var through = require('through2');

function gitRawCommits(options) {
  var readable = new stream.Readable();
  readable._read = function() {};

  options = options || {};
  options.format = options.format || '%B';
  options.from = options.from || '';
  options.to = options.to || 'HEAD';

  var args = dargs(options, {
    excludes: ['from', 'to', 'format']
  });

  var cmd = template(
    'git log --tags --no-color --format="<%= format %>%n------------------------ >8 ------------------------" ' +
    '"<%- from ? [from, to].join("..") : to %>" '
  )(options) + args.join(' ');

  if (options.debug) {
    options.debug('Your git-log command is:\n' + cmd);
  }

  var isError = false;

  var child = exec(cmd, {
    maxBuffer: Infinity
  });

  child.stdout
    .pipe(split('------------------------ >8 ------------------------\n'))
    .pipe(through(function(chunk, enc, cb) {
      readable.push(chunk);
      isError = false;

      cb();
    }, function(cb) {
      setImmediate(function() {
        if (!isError) {
          readable.push(null);
          readable.emit('close');
        }

        cb();
      });
    }));

  child.stderr
    .pipe(through.obj(function(chunk) {
      isError = true;
      readable.emit('error', new Error(chunk));
      readable.emit('close');
    }));

  return readable;
}

module.exports = gitRawCommits;
