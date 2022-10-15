import {
  findMatchByLine,
  YarnWorkspaceHelpers,
} from '@bangle.io/yarn-workspace-helpers';

import { ROOT_DIR_PATH } from '../config';

const ws = new YarnWorkspaceHelpers({ rootDir: ROOT_DIR_PATH });

// packages must always import from the root of the package
async function find() {
  await ws.forEachPackage(async (pkg) => {
    const matches: any[] = [];

    let dependencies = Object.keys(pkg.dependencies || {});
    dependencies = dependencies.filter((dep) => !dep.includes('@types'));

    await pkg.forEachFile(async ({ filePath, content, fileHelper }) => {
      if (!fileHelper.isTSFile) {
        return;
      }

      for (const dep of dependencies) {
        if (!dep.startsWith('@bangle.io')) {
          continue;
        }

        let r = findMatchByLine({
          filePath,
          content,
          match: `from '${dep}/`, // find any incorrect usage of import from '@bangle.io/.../sds'
        });

        if (r) {
          matches.push({
            filePath,
            match: r,
          });
        }
      }
    });

    console.log(pkg.name, '-----');

    for (const match of matches) {
      console.log(match);
    }
  });
}

find();
