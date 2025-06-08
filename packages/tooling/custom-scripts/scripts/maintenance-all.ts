import {
  collectAllDependencies,
  isAValidBanglePackage,
  makeLogger,
  setDifference,
  setup,
} from '../lib';
import { formatPackageJSON } from './format-package-json';
import { validate } from './validate-all';

const logger = makeLogger('maintenanceAll');

/**
 * Runs a comprehensive maintenance workflow for the entire workspace.
 * This script combines multiple maintenance operations in the optimal order:
 * 1. Add missing workspace dependencies
 * 2. Remove unused dependencies
 * 3. Format package.json files
 * 4. Validate workspace structure and dependencies
 *
 * Usage: bun packages/tooling/custom-scripts/scripts/maintenance-all.ts
 */
async function main() {
  logger('Starting comprehensive workspace maintenance...');

  const setupResult = await setup({ validatePackageConfig: false });

  try {
    // 1. Add missing workspace dependencies first
    logger('Step 1: Adding missing workspace dependencies...');
    await addWorkspaceDep(setupResult);

    // 2. Remove unused dependencies
    logger('Step 2: Removing unused dependencies...');
    await removeUnusedDeps(setupResult);
    await removeUnusedAllDeps(setupResult);

    // 3. Format package.json files
    logger('Step 3: Formatting package.json files...');
    await formatPackageJSON(setupResult);

    // 4. Validate everything is correct
    logger('Step 4: Validating workspace...');
    await validate(setupResult);

    logger('✅ Comprehensive workspace maintenance completed successfully!');
  } catch (error) {
    logger('❌ Maintenance failed:', error);
    process.exit(1);
  }
}

void main();

const ignoredPackages = ({ depName }: { depName: string }) => {
  return depName.startsWith('@types/') || depName.startsWith('@bangle.dev/');
};

/**
 * Adds workspace dependencies to package.json if they are not already there.
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
            logger(`Adding workspace dep: ${dep} to pkg:${name}`);
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
            logger(`Adding external dep: ${dep} to pkg:${name}`);
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

  // Add bangle dev dependencies
  await pMap(
    packagesMap.entries(),
    async ([name, pkg]) => {
      const deps = (
        await pkg.getImportedPackages((file) => file.isTsNonSrcFile)
      ).filter((dep) => !dep.startsWith('node:'));

      for (const dep of deps) {
        if (!pkg.dependencies[dep] && isAValidBanglePackage(dep, packages)) {
          logger(`Adding workspace devDep: ${dep} to pkg:${name}`);
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
}

/**
 * Remove unused "dependencies" from packages, does not run on nodejs type packages
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
        logger(`Skipping nodejs package ${name}:`, unused);
        return;
      }

      logger(`Removing unused deps from ${name}:`, unused);
      for (const unusedDep of unused) {
        if (
          ignoredPackages({
            depName: unusedDep,
          })
        ) {
          logger(`Skipping ignored package ${unusedDep} in ${name}`);
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
}

/**
 * Remove unused dependencies and devDependencies from all packages
 */
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

      logger(`Package ${name} - checking unused:`, unused.join(', '));

      if (pkg.env === 'nodejs') {
        logger(`Skipping nodejs package ${name}`);
        return;
      }

      logger(`Removing all unused deps from ${name}:`, unused);
      for (const unusedDep of unused) {
        if (
          ignoredPackages({
            depName: unusedDep,
          })
        ) {
          logger(`Skipping ignored package ${unusedDep} in ${name}`);
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
}
