import {
  isAValidBanglePackage,
  makeLogger,
  setDifference,
  setup,
} from '../lib';

const logger = makeLogger('removeUnusedDeps');

function main() {
  return setup()
    .then(async (item) => {
      await removeUnusedDeps(item);
      return item;
    })
    .then((item) => {
      return removeUnusedAllDeps(item);
    });
}

void main();

const ignoredPackages = ({ depName }: { depName: string }) => {
  return depName.startsWith('@types/') || depName.startsWith('@bangle.dev/');
};
/**
 * Remove unused "dependencies" from packages,  does not run on nodejs type packages
 * bun packages/tooling/custom-scripts/scripts/remove-unused-deps.ts
 */
async function removeUnusedDeps({
  packagesMap,
}: Awaited<ReturnType<typeof setup>>): Promise<void> {
  const { default: pMap } = await import('p-map');

  const packages = Array.from(packagesMap.values());

  await pMap(
    packagesMap.entries(),
    async ([name, pkg]) => {
      const deps = (
        await pkg.getImportedPackages((file) => file.isTsSrcFile)
      ).filter((dep) => !dep.startsWith('node:'));

      const bangleDepsInCode = new Set(
        deps.filter((dep) => isAValidBanglePackage(dep, packages)),
      );

      const bangleDepsInPkgJson = new Set(
        Object.keys(pkg.dependencies).filter((dep) =>
          isAValidBanglePackage(dep, packages),
        ),
      );

      const unused = [...setDifference(bangleDepsInPkgJson, bangleDepsInCode)];
      if (unused.length === 0) {
        return;
      }

      if (pkg.env === 'nodejs') {
        logger(`skipping nodejs ${name} package`, unused);
        return;
      }

      logger(`removing ${name} package`, unused);
      for (const unusedDep of unused) {
        if (
          ignoredPackages({
            depName: unusedDep,
          })
        ) {
          logger(`skipping ${unusedDep} package in ${name}`);
          continue;
        }

        await pkg.removeDependency({
          name: unusedDep,
          type: 'dependencies',
        });
      }
    },
    {
      concurrency: 8,
    },
  );

  logger('Done');
}

// does not run on nodejs type packages
async function removeUnusedAllDeps({
  packagesMap,
}: Awaited<ReturnType<typeof setup>>): Promise<void> {
  const { default: pMap } = await import('p-map');

  await pMap(
    packagesMap.entries(),
    async ([name, pkg]) => {
      const deps = (
        await pkg.getImportedPackages((file) => file.isTSFile)
      ).filter((dep) => !dep.startsWith('node:'));

      const bangleDepsInCode = new Set(deps);

      const bangleDepsInPkgJson = new Set([
        ...Object.keys(pkg.dependencies),
        ...Object.keys(pkg.devDependencies),
      ]);

      const unused = [...setDifference(bangleDepsInPkgJson, bangleDepsInCode)];
      if (unused.length === 0) {
        return;
      }

      logger(`Package: ${name} - does not appear to use `, unused.join(' , '));

      if (pkg.env === 'nodejs') {
        logger(`skipping nodejs ${name} package`);
        return;
      }

      logger(`removing ${name} package`, unused);
      for (const unusedDep of unused) {
        if (
          ignoredPackages({
            depName: unusedDep,
          })
        ) {
          logger(`skipping ${unusedDep} package in ${name}`);
          continue;
        }

        await pkg.removeDependency({
          name: unusedDep,
          type: 'dependencies',
        });

        await pkg.removeDependency({
          name: unusedDep,
          type: 'devDependencies',
        });
      }
    },
    {
      concurrency: 8,
    },
  );

  logger('Done');
}
