const fs = require('fs');
const path = require('path');

function run() {
  const indexHtml = fs.readFileSync(
    path.resolve(__dirname, '..', '..', 'index.html'),
    'utf-8',
  );

  let data = indexHtml
    .split('\n')
    .map((r) => r.trim())
    .filter((r) => {
      return r.startsWith('--dark') || r.startsWith('--light');
    });

  let result = data.map((item) => {
    if (item.includes('--dark-')) {
      item = item.split('--dark-').join('');
    }
    if (item.includes('--light-')) {
      item = item.split('--light-').join('');
    }

    item = item.slice(0, item.indexOf(':'));

    return item;
  });

  let newResult = [];

  // dedupe the array and preserve the order
  result.forEach((element) => {
    if (!newResult.includes(element)) {
      newResult.push(element);
    }
  });

  fs.writeFileSync(
    path.resolve(__dirname, '..', '..', 'lib', 'ui-context', 'css-vars.ts'),
    `export const cssVars = ${JSON.stringify(newResult, null, 2).replaceAll(
      '"',
      `'`,
    )};`,
    'utf-8',
  );
}

run();
