import React, { useCallback, useState } from 'react';

import { EditorView } from '@bangle.dev/pm';

import { EditorDisplayType } from '@bangle.io/constants';
import { PopupEditor } from '@bangle.io/editor';
import type {
  ExtensionRegistry,
  RenderReactNodeView,
} from '@bangle.io/extension-registry';
import { useExtensionRegistryContext } from '@bangle.io/extension-registry';
import { useHover, useTooltipPositioner } from '@bangle.io/ui-bangle-button';
import { NoteIcon } from '@bangle.io/ui-components';
import {
  conditionalSuffix,
  cx,
  getEditorPluginMetadata,
} from '@bangle.io/utils';
import { useWorkspaceContext } from '@bangle.io/workspace-context';
import {
  filePathToWsPath,
  parseLocalFilePath,
  PathValidationError,
  resolvePath,
  validateNoteWsPath,
} from '@bangle.io/ws-path';

import { backLinkNodeName, newNoteLocation } from '../config';

export function BackLinkNode({
  nodeAttrs,
  view,
}: {
  nodeAttrs: { path: string; title?: string };
  view: EditorView;
}) {
  const extensionRegistry = useExtensionRegistryContext();
  // TODO currently bangle.dev doesn't pass editorview context so we are
  // unable to use `useEditorPluginMetadata` which itself uses `useEditorViewContext`
  // which will be undefined for react nodeviews.
  const { wsPath: primaryWsPath, editorDisplayType } = getEditorPluginMetadata(
    view.state,
  );

  const { wsName, noteWsPaths, createNote, pushWsPath } = useWorkspaceContext();

  let { path, title } = nodeAttrs;
  const [invalidLink, updatedInvalidLink] = useState(false);
  title = title || path;

  const backLinkPath = conditionalSuffix(path, '.md');

  if (invalidLink) {
    title = 'Invalid link (' + title + ')';
  }

  const onClick = useCallback(
    (event) => {
      event.preventDefault();
      if (!wsName || !noteWsPaths) {
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
        currentWsPath: primaryWsPath,
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
    },
    [
      backLinkPath,
      createNote,
      extensionRegistry,
      noteWsPaths,
      primaryWsPath,
      pushWsPath,
      wsName,
    ],
  );

  const backlinksWsPath =
    wsName &&
    noteWsPaths &&
    getMatchingWsPath(wsName, backLinkPath, noteWsPaths);

  const disablePopup = editorDisplayType === EditorDisplayType.Popup;

  const { hoverProps, isHovered } = useHover({ isDisabled: disablePopup });
  const { hoverProps: tooltipHoverProps, isHovered: isTooltipHovered } =
    useHover({ isDisabled: disablePopup });

  const {
    isTooltipVisible,
    setTooltipElement,
    setTriggerElement,
    tooltipProps,
  } = useTooltipPositioner({
    isDisabled: disablePopup,
    isActive: !disablePopup && (isHovered || isTooltipHovered),
    xOffset: 10,
    yOffset: 0,
    // TODO we can optimize where we position based on where empty
    // space exists
    placement: 'right',
    delay: 350,
    immediateClose: false,
  });

  return (
    <>
      <button
        ref={setTriggerElement}
        {...hoverProps}
        className={cx(
          'inline-backlink_backlink',
          !backlinksWsPath && `inline-backlink_backlinkNotFound`,
        )}
        // prevent the button from being dragged, which messes up our system
        // we want the node view to be dragged so the dom serializers can kick in
        draggable={false}
        onClick={onClick}
      >
        <NoteIcon className="inline-block" />
        <span className="inline-block">{title}</span>
      </button>

      {isTooltipVisible && backlinksWsPath && (
        <PopupEditor
          ref={setTooltipElement}
          editorProps={{ wsPath: backlinksWsPath }}
          popupContainerProps={{
            style: tooltipProps.style,
            className: 'inline-backlink_popup-editor',
            positionProps: {
              ...tooltipHoverProps,
              ...tooltipProps.attributes,
            },
          }}
        />
      )}
    </>
  );
}

async function handleClick({
  backLinkPath,
  currentWsPath,
  wsName,
  noteWsPaths,
  extensionRegistry,
  createNote,
}: {
  backLinkPath: string;
  currentWsPath: string;
  wsName: string;
  noteWsPaths: string[];
  extensionRegistry: ExtensionRegistry;
  createNote: ReturnType<typeof useWorkspaceContext>['createNote'];
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

export const renderReactNodeView: RenderReactNodeView = {
  [backLinkNodeName]: ({ nodeViewRenderArg }) => {
    const { path, title } = nodeViewRenderArg.node.attrs;
    if (typeof path !== 'string') {
      return <span>Invalid Path</span>;
    }
    return (
      <BackLinkNode nodeAttrs={{ path, title }} view={nodeViewRenderArg.view} />
    );
  },
};

function getMatchingWsPath(wsName: string, path: string, allWsPaths: string[]) {
  function _findMatch(
    wsName: string,
    path: string,
    allWsPaths: string[],
    comparator = (a: string, b: string) => a === b,
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
