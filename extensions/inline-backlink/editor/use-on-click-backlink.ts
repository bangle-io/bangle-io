import { useCallback } from 'react';

import { EditorState, EditorView } from '@bangle.dev/pm';

import { notification } from '@bangle.io/api';
import {
  createNote,
  pushWsPath,
  useWorkspaceContext,
} from '@bangle.io/slice-workspace';
import { getMouseClickType, MouseClick } from '@bangle.io/utils';
import {
  filePathToWsPath,
  getExtension,
  parseLocalFilePath,
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
  currentWsPath: string;
  editorState: EditorState;
}) {
  const { wsName, noteWsPaths, bangleStore } = useWorkspaceContext();

  return useCallback(
    (event: React.MouseEvent<any, MouseEvent>) => {
      event.preventDefault();

      if (!wsName || !noteWsPaths) {
        return;
      }

      handleClick({
        wikiLink,
        currentWsPath: currentWsPath,
        wsName,
        noteWsPaths,
        bangleStore,
        editorState,
      }).then(
        (matchedWsPath) => {
          const clickType = getMouseClickType(event);
          pushWsPath(
            matchedWsPath,
            clickType === MouseClick.NewTab,
            clickType === MouseClick.ShiftClick,
          )(bangleStore.state, bangleStore.dispatch);
        },
        (error) => {
          if (error instanceof PathValidationError) {
            notification.showNotification({
              severity: 'error',
              title: 'Invalid backlink path',
              content: error.message,
              uid: Date.now() + '-invalid-backlink-path',
            })(bangleStore.state, bangleStore.dispatch);

            return;
          }
          throw error;
        },
      );
    },
    [noteWsPaths, currentWsPath, editorState, wikiLink, wsName, bangleStore],
  );
}

async function handleClick({
  wikiLink,
  currentWsPath,
  wsName,
  noteWsPaths,
  bangleStore,
  editorState,
}: {
  wikiLink: string;
  currentWsPath: string;
  wsName: string;
  noteWsPaths: string[];
  bangleStore: ReturnType<typeof useWorkspaceContext>['bangleStore'];
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
  let newWsPath = filePathToWsPath(wsName, wikiLinkWithExt);

  // Check if the user wants to create a new note in the same dir
  if (
    NEW_NOTE_LOCATION === 'CURRENT_DIR' &&
    currentWsPath &&
    !wikiLink.includes('/')
  ) {
    newWsPath = parseLocalFilePath(wikiLinkWithExt, currentWsPath);
  }

  validateNoteWsPath(newWsPath);

  await createNote(newWsPath, { open: false })(
    bangleStore.state,
    bangleStore.dispatch,
    bangleStore,
  );

  return newWsPath;
}
