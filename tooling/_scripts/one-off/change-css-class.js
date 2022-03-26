const { getAllPackages, FileWrapper } = require('../lib/work-tree');

run();

async function run() {
  for (const pkg of await getAllPackages()) {
    const files = await pkg.getAllFiles();

    const cssFiles = await pkg.getCSSFiles();

    let knownCssClasses = [];
    for (const cssFile of cssFiles) {
      const cssSrc = await cssFile.readFile();
      for (const cssLine of cssSrc.split('\n')) {
        if (
          cssLine.startsWith('.') &&
          cssLine.endsWith('{') &&
          charCount(cssLine, '.') === 1 &&
          cssLine.includes('>') === false &&
          cssLine.includes(':') === false &&
          cssLine.includes('#') === false
        ) {
          let target = cssLine.slice(1, -1).trim();

          if (target.includes(' ')) {
            continue;
          }
          knownCssClasses.push(target);
        }
      }

      // console.log(
      //   knownCssClasses,
      //   cssFile.filePath,
      //   pkg.name.split('@bangle.io/')[1],
      // );
    }

    const prefix = 'b-' + pkg.name.split('@bangle.io/')[1] + '_';

    for (const className of knownCssClasses) {
      await replaceStringAcrossFiles(files, className, prefix + className);
    }

    // // await replaceStringAcrossFiles(files, 'kushan', 'kushan');
    // for (const file of files) {
    // }
  }
}

/**
 *
 * @param {FileWrapper[]} files
 */
async function replaceStringAcrossFiles(files, matchStr, replaceStr) {
  await Promise.all(
    files.map((file) => {
      return file.transformFile((code) => {
        return code.replaceAll(matchStr, replaceStr);
      });
    }),
  );
}

function charCount(string, char) {
  return string.split(char).length - 1;
}
