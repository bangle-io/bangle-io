import { useCallback } from 'react';

import type { EditorState } from '@bangle.dev/pm';

import { nsmApi2 } from '@bangle.io/api';
import { SEVERITY } from '@bangle.io/constants';
import type { WsName, WsPath } from '@bangle.io/shared-types';
import { getMouseClickType, MouseClick } from '@bangle.io/utils';
import {
  createWsPath,
  filePathToWsPath2,
  getExtension,
  parseLocalFilePath,
  parseLocalFilePath2,
  PathValidationError,
  suffixWithNoteExtension,
  validateNoteWsPath,
} from '@bangle.io/ws-path';

import { calcWikiLinkMapping, getAllWikiLinks } from '../calculate-matches';
import { NEW_NOTE_LOCATION } from '../config';

export function useOnClickBacklink({
  wikiLink,
  currentWsPath,
  editorState,
}: {
  wikiLink: string;
  currentWsPath: WsPath;
  editorState: EditorState;
}) {
  const { wsName, noteWsPaths } = nsmApi2.workspace.useWorkspace();

  return useCallback(
    (event: React.MouseEvent<any>) => {
      event.preventDefault();

      if (!wsName || !noteWsPaths) {
        return;
      }

      handleClick({
        wikiLink,
        currentWsPath: currentWsPath,
        wsName,
        noteWsPaths,
        editorState,
      }).then(
        (_matchedWsPath) => {
          const matchedWsPath = createWsPath(_matchedWsPath);

          const clickType = getMouseClickType(event);

          if (clickType === MouseClick.NewTab) {
            nsmApi2.workspace.openWsPathInNewTab(matchedWsPath);
          } else if (clickType === MouseClick.ShiftClick) {
            nsmApi2.workspace.pushSecondaryWsPath(matchedWsPath);
          } else {
            nsmApi2.workspace.pushPrimaryWsPath(matchedWsPath);
          }
        },
        (error) => {
          if (error instanceof PathValidationError) {
            nsmApi2.ui.showNotification({
              severity: SEVERITY.ERROR,
              title: 'Invalid backlink path',
              content: error.message,
              uid: Date.now() + '-invalid-backlink-path',
              buttons: [],
            });

            return;
          }
          throw error;
        },
      );
    },
    [noteWsPaths, currentWsPath, editorState, wikiLink, wsName],
  );
}

async function handleClick({
  wikiLink,
  currentWsPath,
  wsName,
  noteWsPaths,
  editorState,
}: {
  wikiLink: string;
  currentWsPath: WsPath;
  wsName: WsName;
  noteWsPaths: readonly WsPath[];
  editorState: EditorState;
}) {
  const wikiLinkMapping = calcWikiLinkMapping(
    noteWsPaths,
    getAllWikiLinks(editorState),
  );
  const existingWsPathMatch = wikiLinkMapping.get(wikiLink);

  if (existingWsPathMatch) {
    return existingWsPathMatch;
  }

  const wikiLinkWithExt = getExtension(wikiLink)
    ? wikiLink
    : suffixWithNoteExtension(wikiLink);

  // deal with the case if the path is a local file system style path
  if (
    currentWsPath &&
    (wikiLinkWithExt.startsWith('./') || wikiLinkWithExt.startsWith('../'))
  ) {
    const matchedWsPath = parseLocalFilePath(wikiLinkWithExt, currentWsPath);
    validateNoteWsPath(matchedWsPath);

    return matchedWsPath;
  }

  // create a new note as no existing wsPaths match
  let newWsPath = filePathToWsPath2(wsName, wikiLinkWithExt);

  // Check if the user wants to create a new note in the same dir
  if (
    NEW_NOTE_LOCATION === 'CURRENT_DIR' &&
    currentWsPath &&
    !wikiLink.includes('/')
  ) {
    newWsPath = parseLocalFilePath2(wikiLinkWithExt, currentWsPath);
  }

  validateNoteWsPath(newWsPath);

  await nsmApi2.workspace.createNote(newWsPath, { open: false });

  return newWsPath;
}
