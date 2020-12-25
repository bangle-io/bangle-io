const fs = require('fs/promises');
const path = require('path');
const package = require('../package.json');

const bangleDevLocal = '../bangle-play';

removePortals();

async function removePortals() {
  const resolvedPath = path.resolve(__dirname, '../package.json');
  const deps = Object.entries(package.resolutions).filter(
    ([r, value]) => !r.startsWith('@bangle.dev/'),
  );

  package.resolutions = {
    ...Object.fromEntries(deps),
  };

  await fs.writeFile(
    path.resolve(__dirname, '../package.json'),
    JSON.stringify(package, null, 2),
    'utf-8',
  );
}
