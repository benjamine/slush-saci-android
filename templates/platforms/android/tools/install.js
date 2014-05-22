var path = require('path');
var os = require('os');
var platform = os.platform();

var urls = require('./urls.json');
var fileutil = require('./fileutil');
var download = fileutil.download;

var toolsDir = __dirname;
var downloadDir = path.join(__dirname, 'downloads');

function downloadAndExtract(url, extractPath, done) {
  download(url, {
    targetPath: downloadDir
  }, function(err, filename){
    if (err) {
      done(err);
      return;
    }
    fileutil.extract(filename, {
      extractPath: extractPath
    }, function(err, outputPath) {
      if (err) {
        done(err);
        return;
      }
      done(null, outputPath);
    });
  });
}

function installSDK(done) {
  downloadAndExtract(urls.sdk[platform],
    path.join(toolsDir, 'android-sdk'), function(err, sdkPath) {
    if (err) {
      done(err);
      return;
    }
    console.log('SDK ready at', sdkPath);
    done(null, sdkPath);
  });
}

function installNDK(done) {
  downloadAndExtract(urls.ndk[platform],
    path.join(toolsDir, 'android-ndk'), function(err, ndkPath) {
    if (err) {
      done(err);
      return;
    }
    console.log('NDK ready at', ndkPath);
    done(null, ndkPath);
  });
}

function install(done) {
  installSDK(function(err){
    if (err) {
      done(err);
      return;
    }
    installNDK(function(err) {
      if (err) {
        done(err);
        return;
      }
      done();
    });
  });
}

install(function(err){
  if (err) {
    console.error(err);
    if (err.stack) {
      console.error(err.stack);
    }
    return;
  }
  console.log('installation complete!');
});
