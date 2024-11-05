import path from 'node:path';
import { execa } from 'execa';
import { readJSONSync } from 'fs-extra';
import { rootPath } from '../config';
import { type Package, makeLogger } from '../lib';
import { setup } from '../lib';

const logger = makeLogger('addWhitelistedDeps');

const WHITELISTED_DEPS = ['your-dependency-1', 'your-dependency-2'];

const WHITELISTED_DEV_DEPS = ['@testing-library/react', '@storybook/react'];

const rootPackageJson = readJSONSync(path.join(rootPath, 'package.json'));

async function main() {
  const setupResult = await setup();
  const dependencyVersionMap = buildDependencyVersionMap(
    setupResult.packagesMap,
    rootPackageJson,
  );
  await addWhitelistedDeps(setupResult, dependencyVersionMap);
}

void main();

/**
 * Builds a map of dependency names to versions from existing package.json files.
 */
function buildDependencyVersionMap(
  packagesMap: Map<string, Package>,
  rootPackageJson: any,
): Map<string, string> {
  const versionMap = new Map<string, string>();

  // Add dependencies from root package.json
  if (rootPackageJson.dependencies) {
    for (const [dep, version] of Object.entries(rootPackageJson.dependencies)) {
      versionMap.set(dep, version as string);
    }
  }

  if (rootPackageJson.devDependencies) {
    for (const [dep, version] of Object.entries(
      rootPackageJson.devDependencies,
    )) {
      if (!versionMap.has(dep)) {
        versionMap.set(dep, version as string);
      }
    }
  }

  // Add dependencies from all packages in the workspace
  for (const pkg of packagesMap.values()) {
    if (pkg.dependencies) {
      for (const [dep, version] of Object.entries(pkg.dependencies)) {
        if (!versionMap.has(dep)) {
          versionMap.set(dep, version as string);
        }
      }
    }
    if (pkg.devDependencies) {
      for (const [dep, version] of Object.entries(pkg.devDependencies)) {
        if (!versionMap.has(dep)) {
          versionMap.set(dep, version as string);
        }
      }
    }
  }

  return versionMap;
}

/**
 * Adds whitelisted dependencies to package.json if they are used in TypeScript files.
 */
async function addWhitelistedDeps(
  { packagesMap }: Awaited<ReturnType<typeof setup>>,
  dependencyVersionMap: Map<string, string>,
): Promise<void> {
  const { default: pMap } = await import('p-map');

  await pMap(
    packagesMap.entries(),
    async ([name, pkg]) => {
      // Get imported packages from TypeScript files
      const deps = (
        await pkg.getImportedPackages((file) => file.isTSFile)
      ).filter((dep) => !dep.startsWith('node:'));

      // Add dependencies
      for (const dep of WHITELISTED_DEPS) {
        if (deps.includes(dep) && !pkg.dependencies[dep]) {
          const version = dependencyVersionMap.get(dep) || '*';
          logger(`Adding dependency: ${dep}@${version} to package: ${name}`);
          await pkg.addDependency({
            name: dep,
            version,
            type: 'dependencies',
          });
        }
      }

      // Add devDependencies
      for (const dep of WHITELISTED_DEV_DEPS) {
        if (deps.includes(dep) && !pkg.devDependencies[dep]) {
          const version = dependencyVersionMap.get(dep) || '*';
          logger(`Adding devDependency: ${dep}@${version} to package: ${name}`);
          await pkg.addDependency({
            name: dep,
            version,
            type: 'devDependencies',
          });
        }
      }
    },
    {
      concurrency: 8,
    },
  );

  // Install new dependencies
  await execa('pnpm', ['-w', 'install'], {
    cwd: rootPath,
    stdio: 'inherit',
  });

  logger('Done');
}
