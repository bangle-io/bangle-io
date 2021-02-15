const fs = require('fs/promises');
const path = require('path');
const pkg = require('../package.json');

const bangleDevLocal = '../bangle-play';

removePortals();

async function removePortals() {
  const resolvedPath = path.resolve(__dirname, '../package.json');
  const deps = Object.entries(pkg.resolutions).filter(
    ([r, value]) => !r.startsWith('@bangle.dev/'),
  );

  pkg.resolutions = {
    ...Object.fromEntries(deps),
  };

  await fs.writeFile(
    path.resolve(__dirname, '../package.json'),
    JSON.stringify(pkg, null, 2),
    'utf-8',
  );
}
