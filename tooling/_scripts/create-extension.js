const fs = require('fs');
const { rootDir } = require('./constants');
const path = require('path');

const getPackageJSON = (name) =>
  JSON.stringify(
    {
      name,
      version: '0.0.0',
      authors: [
        {
          name: 'Kushan Joshi',
          email: '0o3ko0@gmail.com',
          web: 'http://github.com/kepta',
        },
      ],
      repository: {
        type: 'git',
        url: 'git+https://github.com/bangle-io/bangle-io.git',
      },
      bugs: {
        url: 'https://github.com/bangle-io/bangle-io/issues',
      },
      main: 'index.js',
      module: 'index.js',
      scripts: {},
      dependencies: {
        'extension-registry': 'workspace:*',
        'utils': 'workspace:*',
      },
      publishConfig: {
        access: 'restricted',
      },
    },
    null,
    2,
  );
const getIndexJS = (name) => `
import { Extension } from 'extension-registry/index';

const extensionName = '${name}';

const extension = Extension.create({
  name: extensionName,
});

export default extension;
`;

function main() {
  const extensionName = process.argv.slice(2)[0];

  if (typeof extensionName === 'string' && extensionName.length === 0) {
    throw new Error('Invalid extension name : ' + extensionName);
  }

  const folderLocation = path.join(rootDir, 'extensions', extensionName);
  fs.mkdirSync(folderLocation);
  fs.writeFileSync(
    path.join(folderLocation, 'package.json'),
    getPackageJSON(extensionName),
    'utf-8',
  );
  fs.writeFileSync(
    path.join(folderLocation, 'index.js'),
    getIndexJS(extensionName),
    'utf-8',
  );
  const workspacePackageLocation = path.join(
    rootDir,
    'extensions',
    'package.json',
  );

  let workspacePackage = JSON.parse(
    fs.readFileSync(workspacePackageLocation, 'utf-8'),
  );
  workspacePackage.workspaces.push(extensionName);

  fs.writeFileSync(
    workspacePackageLocation,
    JSON.stringify(workspacePackage, null, 2),
    'utf-8',
  );
  require('child_process').execSync(`yarn install`);
  console.log('done');
}

main();
