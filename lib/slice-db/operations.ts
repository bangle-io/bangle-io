import { assertNotUndefined } from '@bangle.io/utils';

import type { ExtensionDB } from './common';
import { dbSliceKey } from './common';

export function getExtensionDb<Schema extends { [k: string]: any }>(
  extensionName: string,
) {
  return dbSliceKey.queryOp((state): ExtensionDB<Schema> => {
    const db =
      dbSliceKey.getSliceStateAsserted(state).extensionDbs[extensionName];

    assertNotUndefined(db, `No extension db for ${extensionName}`);

    return db;
  });
}
