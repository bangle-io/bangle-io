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
  const workspaceLookup = Object.fromEntries(
    workspaces.map((r) => [r.name, r]),
  );
  const workspaceToPath = Object.fromEntries(
    workspaces.map((r) => [r.name, r.path]),
  );
  for (const w of workspaces) {
    if (w.name === 'bangle-io' || Array.isArray(w.packageJSON.workspaces)) {
      continue;
    }
    // the bangle.io dependnencies
    const internalDep = [];
    [...w.workspaceDeps, ...w.workspaceDevDeps].forEach((dep) => {
      if (workspaceNames.includes(dep)) {
        internalDep.push({
          depName: dep,
          path: workspaceToPath[dep],
          relativePath: path.relative(w.path, workspaceToPath[dep]),
          packageJSON: workspaceLookup[dep].packageJSON,
        });
      }
    });
    // no ts
    if (w.topFiles.includes('tsconfig.json')) {
      continue;
    }
    const workspacePaths = Object.fromEntries(
      internalDep
        .flatMap((r) => {
          return [
            [r.depName + '/*', [r.relativePath + '/*']],
            [r.depName + '', [r.relativePath + '/' + r.packageJSON.main]],
          ];
        })
        .sort((a, b) => a[0].localeCompare(b[0])),
    );
    const jsconfig = jsconfigTemplate(workspacePaths, w.path, w.rootPath);
    await fs.writeFile(path.join(w.path, 'jsconfig.json'), jsconfig, 'utf-8');
  }
}
