/// <reference path="./missing-types.d.ts" />
import aliasLookup from 'emoji-lookup-data/data/alias_lookup.json';

export const aliasEmojiPair = aliasLookup.map((r): [string, string] => [
  r[0],
  r[1],
]);
export const aliasToEmojiObj = Object.fromEntries(aliasEmojiPair);
