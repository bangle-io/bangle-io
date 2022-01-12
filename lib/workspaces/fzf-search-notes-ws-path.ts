import type { FzfResultItem } from '@bangle.io/fzf-search';
import { byLengthAsc, Fzf } from '@bangle.io/fzf-search';
import { assertSignal, sleep } from '@bangle.io/utils';
import { resolvePath } from '@bangle.io/ws-path';

import { listAllNotes } from './file-system';

const NOTE_WS_PATH_CHUNK_SIZE = 1000;

export async function fzfSearchNoteWsPaths(
  abortSignal: AbortSignal,
  wsName: string,
  query: string,
  limit: number = 128,
) {
  const wsPaths = await listAllNotes(wsName);

  assertSignal(abortSignal);

  const CHUNK_SIZE = NOTE_WS_PATH_CHUNK_SIZE;

  if (wsPaths.length === 0) {
    return [];
  }

  let result: FzfResultItem[] = [];

  // TODO chunking like this is not ideal as fzf doesnt see
  // all the data at once and ends up applying limit to
  // each chunk
  for (let i = 0; i < wsPaths.length; i += CHUNK_SIZE) {
    assertSignal(abortSignal);
    const chunk = wsPaths.slice(i, i + CHUNK_SIZE);
    const fzf = new Fzf(chunk, {
      limit: limit,
      selector: (item) => resolvePath(item).filePath,
      tiebreakers: [byLengthAsc],
    });

    result = result.concat(fzf.find(query));
    // introduce sleep to add async-ness
    // this will help abort if needed
    await sleep(8);
  }
  return result.slice(0, limit);
}
