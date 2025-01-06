import { makeLogger } from '../lib';
import { collectAllDependencies, isAValidBanglePackage, setup } from '../lib';

const logger = makeLogger('addWorkspaceDep');

function main() {
  return setup().then(async (item) => {
    return addWorkspaceDep(item);
  });
}

void main();

/**
 * Adds a workspace dependency to package.json if it is not already there.
 * bun packages/tooling/custom-scripts/scripts/add-workspace-dep.ts
 */
async function addWorkspaceDep({
  packagesMap,
}: Awaited<ReturnType<typeof setup>>): Promise<void> {
  const { default: pMap } = await import('p-map');

  const packages = Array.from(packagesMap.values());
  const allDependencies = await collectAllDependencies(packagesMap);

  await pMap(
    packagesMap.entries(),
    async ([name, pkg]) => {
      const deps = (
        await pkg.getImportedPackages((file) => file.isTsSrcFile)
      ).filter((dep) => !dep.startsWith('node:'));

      for (const dep of deps) {
        if (!pkg.dependencies[dep]) {
          if (isAValidBanglePackage(dep, packages)) {
            logger(`Adding dep: ${dep} to pkg:${name}`);
            await pkg.addDependency({
              name: dep,
              version: 'workspace:*',
              type: 'dependencies',
            });
          } else if (allDependencies[dep]) {
            const versions = allDependencies[dep].versions;
            const version = versions[0];

            if (!version) {
              throw new Error(`No version found for ${dep}`);
            }
            logger(`Adding dep: ${dep} to pkg:${name}`);
            await pkg.addDependency({
              name: dep,
              version: version,
              type: 'dependencies',
            });
          }
        }
      }
    },
    {
      concurrency: 8,
    },
  );

  // currently only install bangel dev dependencies
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

  // await execa('pnpm', ['-w', 'install', '--offline'], {
  //   cwd: rootPath,
  //   stdio: 'inherit',
  // }).then(() => {
  //   return 'runPnpmInstall done';
  // });

  logger('Done');
}
