const path = require('path');

const rootDir = path.resolve(__dirname, '..', '..');
const rootPackagePath = path.join(rootDir, 'package.json');

module.exports = {
  rootDir,
  rootPackagePath,
};
