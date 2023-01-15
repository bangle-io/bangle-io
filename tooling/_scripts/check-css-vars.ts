import { vars } from '@bangle.io/css-vars';
import { isPlainObject } from '@bangle.io/mini-js-utils';
import { YarnWorkspaceHelpers } from '@bangle.io/yarn-workspace-helpers';

import { ROOT_DIR_PATH } from './config';

if (require.main === module) {
  checkCssVars();
}

// checks if css vars are valid and exist
export async function checkCssVars(
  ws = new YarnWorkspaceHelpers({ rootDir: ROOT_DIR_PATH }),
) {
  const knownCssVars = new Set(
    deepObjectValues(vars).map((r) => {
      return r.split('var(').join('').split(')').join('');
    }),
  );

  const unknownCssVars = new Set<string>();
  const regex = /(--BV)[^\,\:\)]+/g;

  await ws.forEachPackage(async (pkg) => {
    await pkg.forEachFile(async ({ fileHelper, content }) => {
      if (!fileHelper.isCSSFile) {
        return;
      }

      let matches = [...content.matchAll(regex)].map((r) => r[0]);

      matches.forEach((match) => {
        if (!knownCssVars.has(match)) {
          unknownCssVars.add(match);
        }
      });
    });
  });

  if (unknownCssVars.size > 0) {
    throw new Error(
      `Unknown css var design token found: ${[...unknownCssVars].join(
        ', ',
      )}. This is most likely a bug, please try to use the correct design token or create one. See contributing.md styling section for more details.`,
    );
  }
}

function deepObjectValues(obj: Record<string, any>): any[] {
  return Object.values(obj).reduce<string[]>((acc, val) => {
    if (isPlainObject(val)) {
      return [...acc, ...deepObjectValues(val)];
    }

    return [...acc, val];
  }, []);
}
