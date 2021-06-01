const { rootDir } = require('./constants');
const fs = require('fs/promises');
const path = require('path');

module.exports = {
  walkWorkspace,
  walk,
};

async function walk(dir, { ignore }) {
  let results = [];
  const list = await fs.readdir(dir);
  for (const item of list) {
    const newPath = path.join(dir, item);
    const stat = await fs.stat(newPath);

    if (ignore({ path: newPath, stat })) {
      continue;
    }
    if (stat.isDirectory()) {
      results = results.concat(await walk(newPath, { ignore }));
    } else {
      results.push(newPath);
    }
  }
  return results;
}

const globalIgnore = ({ path, stat }) => {
  return (
    path.includes('.DS_Store') ||
    path.includes('.yarn') ||
    path.includes('.git') ||
    path.includes('_scripts') ||
    path.includes('build') ||
    path.includes('node_modules')
  );
};
async function mapFiles(dir = '.', mapper, { ignore = () => false } = {}) {
  const results = await walk(dir, {
    ignore: (...args) => {
      return globalIgnore(...args) || ignore(...args);
    },
  });
  const fileData = await Promise.all(
    results.map(async (r) => [r, await fs.readFile(r, 'utf-8')]),
  );
  for (const [filePath, content] of fileData) {
    const newContent = await mapper(filePath, content);
    if (newContent !== content) {
      await fs.writeFile(filePath, newContent, 'utf-8');
    }
  }
}

async function walkWorkspace() {
  const rootPath = rootDir;
  let result = await Promise.all(
    require('child_process')
      .execSync(`yarn workspaces list --json`)
      .toString()
      .split('\n')
      .filter(Boolean)
      .map((r) => JSON.parse(r))
      .map(async (r) => {
        const _path = path.resolve(rootPath, r.location);

        const packageJSON = JSON.parse(
          await fs.readFile(path.join(_path, 'package.json'), 'utf-8'),
        );

        const topLevelItems = await fs.readdir(_path);

        const items = await Promise.all(
          topLevelItems.map(async (item) => {
            const newPath = path.join(_path, item);
            const stat = await fs.stat(newPath);
            return {
              isDirectory: stat.isDirectory(),
              isFile: stat.isFile(),
              name: item,
              path: newPath,
            };
          }),
        );

        const obj = {
          ...r,
          packageJSON,
          modifyPackageJSON: async (cb) => {
            const newJSON = await cb(packageJSON, obj);
            await fs.writeFile(
              path.join(_path, 'package.json'),
              JSON.stringify(newJSON, null, 2),
              'utf-8',
            );
          },
          rootPath,
          path: _path,
          topFiles: items.filter((i) => i.isFile).map((r) => r.name),
          topDirectories: items.filter((i) => i.isDirectory).map((r) => r.name),
        };
        return obj;
      }),
  );

  return result;
}
