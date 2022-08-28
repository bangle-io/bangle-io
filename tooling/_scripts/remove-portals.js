const { rootPackagePath } = require('./constants');
const fs = require('fs/promises');

removePortals();

async function removePortals() {
  const pkg = JSON.parse(await fs.readFile(rootPackagePath, 'utf-8'));
  const deps = Object.entries(pkg.resolutions).filter(
    ([r, value]) => !r.startsWith('@bangle.dev/'),
  );

  pkg.resolutions = {
    ...Object.fromEntries(deps),
  };

  await fs.writeFile(rootPackagePath, JSON.stringify(pkg, null, 2), 'utf-8');
}
