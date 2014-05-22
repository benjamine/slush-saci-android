var fs = require('fs');
var os = require('os');
var path = require('path');
var http = require('http');
var child_process = require('child_process');

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

function removeExtractedTopFolder(extractPath, options, done) {
  var contents = fs.readdirSync(extractPath);
  if (contents.length === 1 &&
    fs.statSync(path.join(extractPath, contents[0])).isDirectory() &&
    options.removeTopFolder !== false) {
    // remove the top folder, moving the inner folder up
    fs.renameSync(path.join(extractPath, contents[0]), extractPath + '_tmp');
    fs.rmdirSync(extractPath);
    fs.renameSync(extractPath + '_tmp', extractPath);
  }
  done(null, extractPath);
}

function extractZip(filename, outputPath, options, done) {
  var AdmZip = require('adm-zip');
  var zip = new AdmZip(filename);
  zip.extractAllTo(outputPath, false);
  removeExtractedTopFolder(outputPath, options, done);
}

function extractBz2(filename, outputPath, options, done) {
  // extract spawning child process
  var commandName = 'tar';
  mkdir(outputPath);
  var child = child_process.spawn(commandName, [
    '-xjf', filename, '-C', outputPath
    ]);
  child.stdout.on('data', function (data) {
    console.log(commandName + '> ' + data);
  });
  child.stderr.on('data', function (data) {
    console.log(commandName + '> ' + data);
  });
  child.on('close', function (code) {
    if (code !== 0) {
      done(new Error(commandName + ' exited with code ' + code));
      return;
    }
    removeExtractedTopFolder(outputPath, options, done);
  });
}

function extract(filename, options, done) {
  try {
    var extname = path.extname(filename);
    options = options || {};
    if (typeof options === 'string') {
      options = {
        extractPath: options
      };
    }
    var outputPath = options.extractPath || path.join(path.dirname(filename),
      options.extractFolderName || path.basename(filename, extname));
    if (outputPath.slice(-4).toLowerCase() === '.tar') {
      outputPath = outputPath.slice(0, -4);
    }
    if (fs.existsSync(outputPath)) {
      if (fs.statSync(outputPath).ctime.getTime() < fs.statSync(filename).ctime.getTime()) {
        throw new Error('extract path already exists: ' + outputPath);
      } else {
        done(null, outputPath);
        return;
      }
    }
    extname = extname.toLowerCase();
    console.log('decompressing...');
    if (extname === '.zip') {
      extractZip(filename, outputPath, options, done);
      return;
    }
    if (extname === '.bz2') {
      extractBz2(filename, outputPath, options, done);
      return;
    }
    throw new Error('unsupported archive type: ' + extname);
  } catch(err) {
    done(err);
  }
}

exports.download = download;
exports.mkdir = mkdir;
exports.extract = extract;
