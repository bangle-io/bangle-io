const {
  getAllPackages,
  getAllTextFiles,
  FileWrapper,
} = require('../lib/work-tree');

run();

async function run() {
  for (const pkg of await getAllPackages()) {
    const files = await getAllTextFiles();

    const prefix = 'b-' + pkg.name.split('@bangle.io/')[1] + '_';
    const newPrefix = 'B-' + pkg.name.split('@bangle.io/')[1] + '_';

    await replaceStringAcrossFiles(files, prefix, newPrefix);

    // console.log(cssFiles.map((r) => r.filePath));
    // // let knownCssClasses = [];

    // // for (const className of knownCssClasses) {
    // //   await replaceStringAcrossFiles(
    // //     files.filter((r) => r.isCSS()),
    // //     className,
    // //     prefix + className,
    // //   );
    // // }

    // // // await replaceStringAcrossFiles(files, 'kushan', 'kushan');
    // // for (const file of files) {
    // // }
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
        const result = code.replaceAll(matchStr, replaceStr);

        return result;
      });
    }),
  );
}
