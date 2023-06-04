import type { FzfOptions, FzfResultItem } from '@bangle.io/fzf-search';
import { byLengthAsc, byStartAsc, Fzf } from '@bangle.io/fzf-search';
import type { WsName, WsPath } from '@bangle.io/shared-types';
import { assertSignal } from '@bangle.io/utils';
import { resolvePath } from '@bangle.io/ws-path';

import type { GetWsPaths } from '../abortable-services';

export function fzfSearchNoteWsPaths(getNoteWsPaths: GetWsPaths) {
  return async (
    abortSignal: AbortSignal,
    wsName: WsName,
    query: string,
    limit: number = 128,
  ): Promise<Array<FzfResultItem<WsPath>>> => {
    const wsPaths: string[] = await getNoteWsPaths(wsName, abortSignal);

    assertSignal(abortSignal);

    if (!wsPaths || wsPaths.length === 0) {
      return [];
    }

    const options: FzfOptions = {
      limit: limit,
      selector: (item) => resolvePath(item, true).filePath,
      fuzzy: query.length <= 4 ? 'v1' : 'v2',
      tiebreakers: [byLengthAsc, byStartAsc],
    };

    const fzf = new Fzf(wsPaths, options);

    const result: Array<FzfResultItem<any>> = fzf.find(query);

    return result;
  };
}
