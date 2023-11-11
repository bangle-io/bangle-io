import execa from 'execa';

import { makeLogger, makeThrowValidationError } from '../lib';
import { rootPath } from '../lib/constants';
import { isAValidBanglePackage, setup } from '../lib/workspace-helper';

const throwValidationError = makeThrowValidationError('addWorkspaceDep');
const logger = makeLogger('addWorkspaceDep');

function main() {
  return setup().then(async (item) => {
    return addWorkspaceDep(item);
  });
}

void main();

/**
 * Adds a workspace dependency to package.json if it is not already there.
 */
async function addWorkspaceDep({
  packagesMap,
  workspaces,
}: Awaited<ReturnType<typeof setup>>): Promise<void> {
  const { default: pMap } = await import('p-map');

  const packages = Array.from(packagesMap.values());
  await pMap(
    packagesMap.entries(),
    async ([name, pkg]) => {
      const deps = (
        await pkg.getImportedPackages((file) => file.isTsSrcFile)
      ).filter((dep) => !dep.startsWith('node:'));

      for (const dep of deps) {
        if (!pkg.dependencies[dep] && isAValidBanglePackage(dep, packages)) {
          logger(`Adding dep: ${dep} to pkg:${name}`);
          await pkg.addDependency({
            name: dep,
            version: 'workspace:*',
            type: 'dependencies',
          });
        }
      }
    },
    {
      concurrency: 8,
    },
  );

  await pMap(
    packagesMap.entries(),
    async ([name, pkg]) => {
      const deps = (
        await pkg.getImportedPackages((file) => file.isTsNonSrcFile)
      ).filter((dep) => !dep.startsWith('node:'));

      for (const dep of deps) {
        if (!pkg.dependencies[dep] && isAValidBanglePackage(dep, packages)) {
          logger(`Adding devDep: ${dep} to pkg:${name}`);
          await pkg.addDependency({
            name: dep,
            version: 'workspace:*',
            type: 'devDependencies',
          });
        }
      }
    },
    {
      concurrency: 8,
    },
  );

  await execa('pnpm', ['-w', 'install', '--offline'], {
    cwd: rootPath,
    stdio: 'inherit',
  }).then(() => {
    return 'runPnpmInstall done';
  });

  logger('Done');
}
