import { YarnWorkspaceHelpers } from '@bangle.io/yarn-workspace-helpers';

import { ROOT_DIR_PATH } from '../config';

const ws = new YarnWorkspaceHelpers({ rootDir: ROOT_DIR_PATH });

// rename css vars from the --BV-x-y-z (kabab case) to --BVXyz (camel case)
async function find() {
  await ws.forEachPackage(async (pkg) => {
    await pkg.forEachFile(async ({ fileHelper }) => {
      if (!fileHelper.isCSSFile) {
        return;
      }

      let reg = /(--BV)[^\,\:\)]+/g;

      await fileHelper.modify((content) => {
        return content.replaceAll(reg, (match) => {
          let items: string[] = match.split('--BV-')[1]?.split('-') || [];

          const result = [
            items[0] ?? '',
            ...items.slice(1).map((t) => makeFirstCharUpperCase(t)),
          ].join('');

          return `--BV-${result}`;
        });
      });
    });
  });
}

function makeFirstCharUpperCase(str: string): string {
  return str[0]?.toLocaleUpperCase() + str.slice(1);
}

find();
