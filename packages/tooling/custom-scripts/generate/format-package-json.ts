import execa from 'execa';
import path from 'node:path';

import { makeThrowValidationError } from '../lib';
import { rootPath } from '../lib/constants';
import { Package, setup, Workspace } from '../lib/workspace-helper';

export default function main() {
  // provides some nice formatting
  execa.sync(
    'pnpm',
    ['exec', 'syncpack', 'format', '--source', '../../**/package.json'],
    {
      cwd: __dirname,
      stdio: 'inherit',
    },
  );

  return setup().then(async (item) => {
    return formatPackageName(item);
  });
}

void main();

void setup().then(async (item) => {
  return formatPackageName(item);
});

// formats all packagejson in project
async function formatPackageName({
  packagesMap,
  workspaces,
}: {
  packagesMap: Map<string, Package>;
  workspaces: Record<string, Workspace>;
}) {
  const throwValidationError = makeThrowValidationError('formatPackageName');

  const { default: pMap } = await import('p-map');

  await pMap(
    packagesMap.entries(),
    async ([name, pkg]) => {
      await pkg.modifyPackageJSON((pkgJSON) => {
        const {
          name,
          version,
          scripts,
          repository,
          author,
          dependencies,
          devDependencies,
          banglePackageConfig,
          ...otherProps
        } = pkgJSON;
        return {
          name,
          version,
          license: 'AGPL-3.0-or-later',
          repository: {
            type: 'git',
            url: 'https://github.com/bangle-io/bangle-io.git',
            directory: path.relative(rootPath, pkg.packagePath),
          },
          authors: [
            {
              name: 'Kushan Joshi',
              email: '0o3ko0@gmail.com',
              web: 'http://github.com/kepta',
            },
          ],
          homepage: 'https://bangle.io',
          scripts: Object.fromEntries(
            Object.entries(scripts ?? {}).sort(([a], [b]) =>
              a.localeCompare(b),
            ),
          ),
          dependencies,
          devDependencies,
          bugs: {
            url: 'https://github.com/bangle-io/bangle-io/issues',
          },
          banglePackageConfig: {
            type: 'universal',
            ...banglePackageConfig,
          },
          ...otherProps,
        };
      });
    },
    {
      concurrency: 8,
    },
  );
}
