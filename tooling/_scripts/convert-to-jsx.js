var fs = require('fs'),
  config;

// config options
config = {
  targetDir: '.',
  removeFiles: false,
  matchPattern: /([A-Z])\w+/gi,
  replacePattern: '$1',
};

function walk(dir, done) {
  var results = [];
  fs.readdir(dir, (err, list) => {
    if (err) {
      return done(err);
    }
    var i = 0;
    (function next() {
      var file = list[i++];
      if (!file) {
        return done(null, results);
      }
      if (
        file.includes('.yarn') ||
        file.includes('.git') ||
        file.includes('_scripts') ||
        file.includes('build')
      ) {
        next();
        return;
      }
      file = dir + '/' + file;
      fs.stat(file, function (err, stat) {
        if (stat && stat.isDirectory()) {
          walk(file, function (err, res) {
            results = results.concat(res);
            next();
          });
        } else {
          results.push(file);
          next();
        }
      });
    })();
  });
}

function renameFileSync(srcFile, destFile, encoding) {
  var content = fs.readFileSync(srcFile, encoding || 'utf8');
  fs.writeFileSync(destFile, content, encoding || 'utf8');
}

function removeFile(srcFile) {
  fs.unlinkSync(srcFile, function (err) {
    if (err) {
      throw err;
    }
    console.log('Successfully deleted: ' + srcFile);
  });
}

// walk the directory recursively
walk(config.targetDir, function (err, results) {
  if (err) {
    throw err;
  }
  var matchedFiles = [];
  //   console.log(results);

  results.forEach(function (file, i) {
    var outputFile,
      targetFile = file.split('/').slice(-1)[0];
    console.log({ file });

    // if (config.files && config.files.indexOf(targetFile) !== -1) {
    // store it
    matchedFiles.push(file);
    outputFile = targetFile;
    if (
      fs.readFileSync(file).includes(`'react'`) &&
      targetFile.endsWith('.js')
    ) {
      outputFile = outputFile
        .split('.')
        .map((r) => (r === 'js' ? 'jsx' : r))
        .join('.');

      //   console.log('found react', outputFile, targetFile);
    }
    //   outputFile = targetFile.replace(
    //     config.matchPattern,
    //     config.replacePattern,
    //   );
    // console.log('File matched: ' + targetFile);
    fs.renameSync(file, file.replace(targetFile, outputFile));
    // renameFileSync(file, file.replace(targetFile, outputFile));
    // }
  });

  //   if (config.removeFiles) {
  //     console.log('\n----------------------------------------\n');
  //     matchedFiles.forEach(removeFile);
  //   }
});
