import { markdownParser, markdownSerializer } from '@bangle.io/markdown';
import type {
  NoteFormatProvider,
  WorkspaceInfo,
} from '@bangle.io/shared-types';
import { isValidNoteWsPath, OpenedWsPaths } from '@bangle.io/ws-path';

import { WorkspaceError, WorkspaceErrorCode } from './errors';

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
