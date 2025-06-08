import path from 'node:path';
import { PACKAGE_JSON_DEFAULTS, rootPath } from '../config';
import { isMainModule, makeLogger, type Package, setup } from '../lib';

const logger = makeLogger('formatPackageJSON');

if (isMainModule(import.meta.url)) {
  void setup({ validatePackageConfig: false }).then(async (item) => {
    return formatPackageJSON(item);
  });
}

// bun packages/tooling/custom-scripts/scripts-write/format-package-json.ts
// formats all packagejson in project
export async function formatPackageJSON({
  packagesMap,
}: {
  packagesMap: Map<string, Package>;
}) {
  logger('Formatting package.json');
  const { default: pMap } = await import('p-map');

  let count = 0;
  await pMap(
    packagesMap.entries(),
    async ([, pkg]) => {
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
          description,

          ...otherProps
        } = pkgJSON;

        count++;
        return {
          name,
          description: description ?? '',
          license: PACKAGE_JSON_DEFAULTS.license,
          version,
          repository: {
            ...PACKAGE_JSON_DEFAULTS.repository,
            directory: path.relative(rootPath, pkg.packagePath),
          },
          authors: PACKAGE_JSON_DEFAULTS.authors,
          homepage: PACKAGE_JSON_DEFAULTS.homepage,
          bugs: PACKAGE_JSON_DEFAULTS.bugs,
          banglePackageConfig: {
            ...PACKAGE_JSON_DEFAULTS.banglePackageConfig,
            ...banglePackageConfig,
          },
          ...otherProps,
          scripts: Object.fromEntries(
            Object.entries(scripts ?? {}).sort(([a], [b]) =>
              a.localeCompare(b),
            ),
          ),
          dependencies: Object.fromEntries(
            Object.entries(dependencies ?? {}).sort(([a], [b]) =>
              a.localeCompare(b),
            ),
          ),
          devDependencies: Object.fromEntries(
            Object.entries(devDependencies ?? {}).sort(([a], [b]) =>
              a.localeCompare(b),
            ),
          ),
        };
      });
    },
    {
      concurrency: 8,
    },
  );
  logger('Formatted %d package.json', count);
}
