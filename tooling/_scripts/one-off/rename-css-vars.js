const { getAllTextFiles } = require('../lib/work-tree');
const { extractCSSVars } = require('@bangle.io/extract-css-vars');
const path = require('path');
const fs = require('fs');

run();

async function run() {
  const pathToCSSVars = path.resolve(
    __dirname,
    '..',
    '..',
    'public',
    'variables.css',
  );

  const data = await extractCSSVars(fs.readFileSync(pathToCSSVars, 'utf8'));

  let themedVars = data
    .map(([item, value]) => {
      let r = undefined;

      if (item.startsWith('dark-')) {
        r = item.slice('dark-'.length);
      }
      if (item.startsWith('light-')) {
        r = item.slice('light-'.length);
      }

      if (r) {
        return r;
      }

      return undefined;
    })
    .filter(Boolean);

  let vars = data.map(([varName]) => {
    return varName;
  });

  console.log(vars, themedVars);

  const files = await getAllTextFiles();
  for (const file of files) {
    console.log('processing', file.filePath);
    await file.transformFile((content) => {
      let res = content;
      for (const varName of [...themedVars, ...vars]) {
        res = res.split('--' + varName).join('--BV-' + varName);
      }

      return res;
    });
  }
}
