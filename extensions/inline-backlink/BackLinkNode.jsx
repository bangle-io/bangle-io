import React, { useState } from 'react';
import { conditionalSuffix } from 'utils/utility';
import {
  filePathToWsPath,
  useWorkspacePath,
  validateNoteWsPath,
  resolvePath,
  parseLocalFilePath,
  PathValidationError,
} from 'workspace/index';
import { backLinkNodeName, newNoteLocation } from './config';
import { useWorkspaceContext } from 'workspace-context/index';

export function BackLinkNode({ nodeAttrs, extensionRegistry }) {
  let { path, title } = nodeAttrs;
  const { wsName, wsPath: currentWsPath, pushWsPath } = useWorkspacePath();
  const { noteWsPaths = [], createNote } = useWorkspaceContext();

  const [invalidLink, updatedInvalidLink] = useState();
  title = title || path;

  const backLinkPath = conditionalSuffix(path, '.md');
  if (invalidLink) {
    title = 'Invalid link!' + title;
  }

  return (
    <button
      className="back-link"
      // prevent the a-href from being dragged, which messes up our system
      // we want the node view to be dragged to the dom serializers can kick in
      draggable={false}
      onClick={(event) => {
        event.preventDefault();
        if (!wsName) {
          return;
        }
        let newTab = false;
        let shift = false;
        if (
          event.ctrlKey ||
          event.metaKey || // apple
          (event.button && event.button === 1) // middle click, >IE9 + everyone else
        ) {
          newTab = true;
        } else if (event.shiftKey) {
          shift = true;
        }

        handleClick({
          backLinkPath,
          currentWsPath,
          wsName,
          noteWsPaths,
          extensionRegistry,
          createNote,
        }).then(
          (matchedWsPath) => {
            pushWsPath(matchedWsPath, newTab, shift);
          },
          (error) => {
            if (error instanceof PathValidationError) {
              updatedInvalidLink(true);
              return;
            }
            throw error;
          },
        );
      }}
    >
      {`[[${title}]]`}
    </button>
  );
}

async function handleClick({
  backLinkPath,
  currentWsPath,
  wsName,
  noteWsPaths,
  extensionRegistry,
  createNote,
}) {
  const existingWsPathMatch = getMatchingWsPath(
    wsName,
    backLinkPath,
    noteWsPaths,
  );

  if (existingWsPathMatch) {
    return existingWsPathMatch;
  }

  // deal with the case if the path is a local file system style path
  if (
    currentWsPath &&
    (backLinkPath.startsWith('./') || backLinkPath.startsWith('../'))
  ) {
    const matchedWsPath = parseLocalFilePath(backLinkPath, currentWsPath);
    validateNoteWsPath(matchedWsPath);
    return matchedWsPath;
  }

  // create a new note as no existing wsPaths match
  let newWsPath = filePathToWsPath(wsName, backLinkPath);

  // Check if the user wants to create a new note in the same dir
  if (
    newNoteLocation === 'CURRENT_DIR' &&
    currentWsPath &&
    !backLinkPath.includes('/')
  ) {
    newWsPath = parseLocalFilePath(backLinkPath, currentWsPath);
  }

  validateNoteWsPath(newWsPath);

  await createNote(extensionRegistry, newWsPath, { open: false });

  return newWsPath;
}

export const renderReactNodeView = {
  // TODO move to using param wsPath
  [backLinkNodeName]: ({ nodeViewRenderArg, wsPath, extensionRegistry }) => {
    return (
      <BackLinkNode
        nodeAttrs={nodeViewRenderArg.node.attrs}
        extensionRegistry={extensionRegistry}
      />
    );
  },
};

function getMatchingWsPath(wsName, path, allWsPaths) {
  function _findMatch(
    wsName,
    path,
    allWsPaths,
    comparator = (a, b) => a === b,
  ) {
    path = conditionalSuffix(path, '.md');
    const tentativeWsPath = filePathToWsPath(wsName, path);

    const existingMatch = allWsPaths.find((w) =>
      comparator(w, tentativeWsPath),
    );

    if (existingMatch) {
      return existingMatch;
    }

    // if path includes / no magic if a match bring it or undefined
    if (path.includes('/')) {
      return undefined;
    }

    const matches = allWsPaths
      .filter((w) => {
        const { fileName } = resolvePath(w);
        return comparator(fileName, path);
      })
      .sort((a, b) => {
        // If more than one matches you go with the one with least nesting
        return a.split('/').length - b.split('/').length;
      });

    return matches[0];
  }

  let match = _findMatch(wsName, path, allWsPaths);
  if (!match) {
    // Fall back to case insensitive if no exact match
    match = _findMatch(
      wsName,
      path,
      allWsPaths,
      (a, b) => a.toLocaleLowerCase() === b.toLocaleLowerCase(),
    );
  }

  return match;
}
