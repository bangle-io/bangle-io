import { SliceKey } from '@bangle.io/create-store';
import type { DBKeyVal } from '@bangle.io/db-key-val';

export interface ExtensionDB<Schema extends { [k: string]: any } = any> {
  tables: { [T in keyof Schema]: DBKeyVal<Schema[T]> };
}

export type DbAction = {
  name: 'action::@bangle.io/slice-db:dummy';
  value: {};
};

export const dbSliceKey = new SliceKey<
  {
    extensionDbs: { [k: string]: ExtensionDB };
  },
  DbAction
>('@bangle.io/slice-db/slice-key');
