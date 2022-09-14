import { YarnWorkspaceHelpers } from '@bangle.io/yarn-workspace-helpers';

import { ROOT_DIR_PATH } from '../config';

const ws = new YarnWorkspaceHelpers({ rootDir: ROOT_DIR_PATH });

async function find() {
  await ws.forEachPackage(async (pkg) => {
    if (!pkg.packagePath.includes(ROOT_DIR_PATH + '/app/')) {
      return;
    }

    const usedPkg = new Set<string>();

    let dependencies = Object.keys(pkg.dependencies || {});
    dependencies = dependencies.filter((dep) => !dep.includes('@types'));

    await pkg.forEachFile(async ({ filePath, content, fileHelper }) => {
      if (!fileHelper.isTSFile) {
        return;
      }

      for (const dep of dependencies) {
        let r = findMatchByLine({
          filePath,
          content,
          match: [`from '${dep}'`, `from '${dep}/`, `import '${dep}`],
        });

        if (r) {
          usedPkg.add(dep);
        }
      }
    });

    const unusedPkgs = dependencies.filter((dep) => !usedPkg.has(dep));

    // console.log(pkg.name, 'unusedPkgs', Array.from(unusedPkgs));

    let filteredPkgs = Array.from(unusedPkgs).filter(
      (r) =>
        r.startsWith('@bangle.io') &&
        !['@bangle.io/shared-types', '@bangle.io/constants'].includes(r),
    );

    if (filteredPkgs.length > 0) {
      console.log(pkg.name, pkg.packagePath, 'unusedPkgs', filteredPkgs);

      await pkg.runWorkspaceCommand('remove', ...filteredPkgs);
    }
  });
}

find();

function findMatchByLine({
  filePath,
  content,
  match,
}: {
  filePath: string;
  content: string;
  match: RegExp | string | string[];
}): string[] | undefined {
  const result = content
    .split('\n')
    .map((line, index) => {
      if (
        match instanceof RegExp
          ? match.test(line)
          : Array.isArray(match)
          ? match.some((m) => line.includes(m))
          : line.includes(match)
      ) {
        return filePath + ':' + (index + 1);
      }

      return undefined;
    })
    .filter((r): r is string => Boolean(r));

  if (result.length === 0) {
    return undefined;
  }

  return result;
}
