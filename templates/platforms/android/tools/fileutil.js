var fs = require('fs');
var os = require('os');
var path = require('path');
var http = require('http');

var platform = os.platform();
var urls = require('./urls.json');

function byteSize(bytes) {
  var KB = 1024.0;
  var MB = KB * KB;
  var GB = GB * GB;
  if (bytes > 0.5 * GB) {
    return Math.floor(bytes / GB * 100.0) / 100 + 'GB';
  } else if (bytes > 0.5 * MB) {
    return Math.floor(bytes / MB * 100.0) / 100 + 'MB';
  }
  return Math.floor(bytes / KB * 100.0) / 100 + 'KB';
}

function progressBar(count, total) {
  if (!total) {
    return '  ' + byteSize(count);
  }
  var chars = 40;
  var str = '  [';
  var cursor = (count * chars / total);
  for (var i = 0; i < chars; i++) {
    str += (i < cursor) ? '=' : '_';
  }
  str += '] ';
  str += Math.floor(count * 100.0 / total) + '%';
  return str;
}

function mkdir(fullpath) {
  var parent;
  var currentPath = fullpath;
  var newPaths = [];
  while (currentPath && !fs.existsSync(currentPath)) {
    newPaths.push(currentPath);
    currentPath = path.dirname(currentPath);
  }
  while (newPaths.length) {
    currentPath = newPaths.pop();
    fs.mkdirSync(currentPath);
  }
}

function download(url, options, done) {
  try {
    options = options || {};
    console.log('downloading ' + url);
    if (options.targetPath) {
      mkdir(options.targetPath);
    }
    var filename = path.join(options.targetPath || '.', path.basename(url));
    var count = 0;
    var total = 0;
    var request = http.get(url, function(response) {
      total = response.headers['content-length'] || total;
      console.log(' http ' + response.statusCode +
       (total ? (' - size: ' + byteSize(total)) : ''));
      if (response.statusCode >= 300) {
        done(new Error('download error, http status ' + response.statusCode));
        return;
      }
      if (fs.existsSync(filename)) {
        var fileStats = fs.statSync(filename);
        if (fileStats.size == total) {
          var lastModified = new Date(response.headers['last-modified']);
          if (lastModified.getTime() < fileStats.mtime.getTime()) {
            console.log('file already up-to-date, skipped.');
            done(null, filename);
            return;
          }
        }
      }

      console.log('saving as ' + filename);
      var file = fs.createWriteStream(filename + '.part');
      response.pipe(file);
      response.on('error', done);
      response.on('end', function(){
        fs.renameSync(filename + '.part', filename);
        console.log('\ndone.');
        done(null, filename);
      });
      response.on('data', function(chunk) {
        count += chunk.length;
        if (total) {
          process.stdout.write(progressBar(count, total)+ "\r");
        }
      });
    });
  } catch (err) {
    done(err);
  }
}

function extract(filename, extractPath, done) {
  try {
    var extname = path.extname(filename);
    var outputPath = extractPath || path.join(path.dirname(filename), path.basename(filename, extname));
    if (fs.existsSync(outputPath)) {
      throw new Error('extract path already exists: ' + outputPath);
    }
    extname = extname.toLowerCase();
    if (extname !== '.zip') {
      throw new Error('unsupported archive type: ' + extname);
    }
    var AdmZip = require('adm-zip');
    var zip = new AdmZip(filename);
    zip.extractAllTo(outputPath, false);
    done(null, outputPath);
  } catch(err) {
    done(err);
  }
}

exports.download = download;
exports.mkdir = mkdir;
exports.extract = extract;
