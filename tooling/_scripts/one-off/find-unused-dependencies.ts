import {
  findMatchByLine,
  YarnWorkspaceHelpers,
} from '@bangle.io/yarn-workspace-helpers';

import { ROOT_DIR_PATH } from '../config';

const ws = new YarnWorkspaceHelpers({ rootDir: ROOT_DIR_PATH });

async function find() {
  await ws.forEachPackage(async (pkg) => {
    // if (!pkg.packagePath.includes(ROOT_DIR_PATH + '/tooling/')) {
    //   return;
    // }

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
        !r.startsWith('@bangle.dev/') &&
        ![
          '@bangle.io/shared-types',
          'tslib',
          'typescript',
          'react',
          'react-dom',
          '@bangle.io/constants',
        ].includes(r),
    );

    if (filteredPkgs.length > 0) {
      console.log(
        pkg.name,
        pkg.packagePath + '/package.json',
        'unusedPkgs',
        filteredPkgs,
      );

      // await pkg.runWorkspaceCommand('remove', ...filteredPkgs);
    }
  });
}

find();
