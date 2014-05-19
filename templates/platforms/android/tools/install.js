var path = require('path');
var os = require('os');
var platform = os.platform();

var urls = require('./urls.json');
var fileutil = require('./fileutil');
var download = fileutil.download;

var downloadDir = path.join(__dirname, 'downloads');

function installSDK(done) {
  download(urls.sdk[platform], {
    targetPath: downloadDir
  }, function(err, filename){
    if (err) {
      done(err);
      return;
    }
    console.log('extracting ', filename);
    fileutil.extract(filename, null, function(err, outputPath) {
      if (err) {
        done(err);
        return;
      }
      var sdkPath = outputPath;
      console.log('SDK extracted to', sdkPath);
      done(sdkPath);
    });
  });
}

function installNDK(done) {
  download(urls.ndk[platform], {
    targetPath: downloadDir
  }, function(err, filename){
    if (err) {
      done(err);
      return;
    }
    done();
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
    console.error(err.stack);
    return;
  }
  console.log('installation complete!');
});
