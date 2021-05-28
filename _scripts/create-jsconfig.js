const fs = require('fs/promises');
const path = require('path');
const { walkWorkspace } = require('./map-files');

main();

const jsconfigTemplate = (workspacePaths, currentPath, rootPath) => {
  return JSON.stringify(
    {
      extends: path.join(
        path.relative(currentPath, rootPath),
        'jsconfig-base.json',
      ),
      compilerOptions: {
        baseUrl: '.',
        paths: workspacePaths,
      },
    },
    null,
    2,
  );
};

async function main() {
  const workspaces = await walkWorkspace();
  const workspaceNames = workspaces.map((r) => r.name);
  const workspaceToPath = Object.fromEntries(
    workspaces.map((r) => [r.name, r.path]),
  );
  for (const w of workspaces) {
    if (w.name === 'bangle-io') {
      continue;
    }
    const r = w.packageJSON;
    // the bangle.io dependnencies
    const internalDep = [];
    [
      ...Object.keys(r.dependencies || {}),
      ...Object.keys(r.devDependencies || {}),
    ].forEach((dep) => {
      if (workspaceNames.includes(dep)) {
        internalDep.push({
          depName: dep,
          path: workspaceToPath[dep],
          relativePath: path.relative(w.path, workspaceToPath[dep]),
        });
      }
    });
    // no ts
    if (w.topFiles.includes('tsconfig.json')) {
      continue;
    }
    const workspacePaths = Object.fromEntries(
      internalDep.flatMap((r) => [
        [r.depName + '/*', [r.relativePath + '/*']],
        [r.depName + '', [r.relativePath + '/index.js']],
      ]),
    );
    const jsconfig = jsconfigTemplate(workspacePaths, w.path, w.rootPath);
    await fs.writeFile(path.join(w.path, 'jsconfig.json'), jsconfig, 'utf-8');
  }
}
