import { markdownParser, markdownSerializer } from '@bangle.io/markdown';
import type { NoteFormatProvider } from '@bangle.io/shared-types';
import { readWorkspaceInfo } from '@bangle.io/workspace-info';
import { isValidNoteWsPath, OpenedWsPaths } from '@bangle.io/ws-path';

import { workspaceSliceKey } from './common';
import { WorkspaceError } from './errors';

// A faster variant of readWorkspaceInfo
// it checks if the workspace info type is in the slice state, if not it reads from db
export async function getWsInfoType(
  wsName: string,
  state: ReturnType<typeof workspaceSliceKey.getState>,
): Promise<string | undefined> {
  const { cachedWorkspaceInfo } =
    workspaceSliceKey.getSliceStateAsserted(state);

  // Use the cached workspace info if it exists and is of the same wsName
  if (cachedWorkspaceInfo?.name === wsName) {
    return cachedWorkspaceInfo.type;
  }

  return (await readWorkspaceInfo(wsName))?.type;
}

// same as getWsInfoType but throws if wsInfo is not found
export async function getAssertedWsInfoType(
  wsName: string,
  state: ReturnType<typeof workspaceSliceKey.getState>,
): Promise<string> {
  const wsInfoType = await getWsInfoType(wsName, state);

  WorkspaceError.assertWsInfoTypeDefined(wsName, wsInfoType);

  return wsInfoType;
}

export function validateOpenedWsPaths(openedWsPath: OpenedWsPaths):
  | {
      valid: true;
    }
  | {
      invalidWsPath: string;
      valid: false;
    } {
  let invalidWsPath: string | undefined = undefined;

  openedWsPath.forEachWsPath((path) => {
    if (invalidWsPath || path == null) {
      return;
    }

    if (!isValidNoteWsPath(path)) {
      invalidWsPath = path;
    }
  });

  if (invalidWsPath) {
    return { valid: false, invalidWsPath: invalidWsPath };
  }

  return {
    valid: true,
  };
}

export function getPrevOpenedWsPathsFromSearch(
  search?: string,
): OpenedWsPaths | undefined {
  let searchParams = new URLSearchParams(search);
  let prev = searchParams.get('ws_paths');

  if (prev) {
    try {
      let openedWsPaths = OpenedWsPaths.createFromArray(JSON.parse(prev));

      return openedWsPaths;
    } catch (err) {
      return undefined;
    }
  }

  return undefined;
}

export function savePrevOpenedWsPathsToSearch(
  openedWsPaths: OpenedWsPaths,
  searchParams: URLSearchParams,
) {
  if (openedWsPaths.hasSomeOpenedWsPaths()) {
    searchParams.append('ws_paths', JSON.stringify(openedWsPaths.toArray()));
  }
}

export const markdownFormatProvider: NoteFormatProvider = {
  name: 'markdown-format-provider',
  description: 'Saves notes in Markdown format',
  extensions: ['md'],

  serializeNote(doc, specRegistry) {
    return markdownSerializer(doc, specRegistry) || '';
  },

  parseNote(value, specRegistry, plugins) {
    return markdownParser(value, specRegistry, plugins);
  },
};
