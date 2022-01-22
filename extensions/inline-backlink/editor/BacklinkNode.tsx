import React, { useCallback, useEffect, useState } from 'react';

import { EditorView } from '@bangle.dev/pm';

import { EditorDisplayType } from '@bangle.io/constants';
import { PopupEditor } from '@bangle.io/editor';
import type { RenderReactNodeView } from '@bangle.io/extension-registry';
import {
  createNote,
  pushWsPath,
  useWorkspaceContext,
} from '@bangle.io/slice-workspace';
import { useHover, useTooltipPositioner } from '@bangle.io/ui-bangle-button';
import { NoteIcon } from '@bangle.io/ui-components';
import {
  conditionalSuffix,
  cx,
  getEditorPluginMetadata,
  safeCancelIdleCallback,
  safeRequestIdleCallback,
} from '@bangle.io/utils';
import {
  filePathToWsPath,
  parseLocalFilePath,
  PathValidationError,
  resolvePath,
  validateNoteWsPath,
} from '@bangle.io/ws-path';

import { backlinkNodeName, newNoteLocation } from '../config';

export function BacklinkNode({
  nodeAttrs,
  view,
}: {
  nodeAttrs: { path: string; title?: string };
  view: EditorView;
}) {
  // TODO currently bangle.dev doesn't pass editorview context so we are
  // unable to use `useEditorPluginMetadata` which itself uses `useEditorViewContext`
  // which will be undefined for react nodeviews.
  const { wsPath: primaryWsPath, editorDisplayType } = getEditorPluginMetadata(
    view.state,
  );

  const { wsName, noteWsPaths, bangleStore } = useWorkspaceContext();

  let { path, title } = nodeAttrs;
  const [invalidLink, updatedInvalidLink] = useState(false);
  title = title || path;

  const backlinkPath = conditionalSuffix(path, '.md');

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
        backlinkPath,
        currentWsPath: primaryWsPath,
        wsName,
        noteWsPaths,
        bangleStore,
      }).then(
        (matchedWsPath) => {
          pushWsPath(
            matchedWsPath,
            newTab,
            shift,
          )(bangleStore.state, bangleStore.dispatch);
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
    [backlinkPath, noteWsPaths, primaryWsPath, wsName, bangleStore],
  );

  const [backlinksWsPath, updateBacklinksWsPath] = useState<string | undefined>(
    undefined,
  );

  useEffect(() => {
    let timer: undefined | ReturnType<typeof safeRequestIdleCallback> =
      undefined;

    if (wsName && noteWsPaths) {
      timer = safeRequestIdleCallback(
        () => {
          updateBacklinksWsPath(
            getMatchingWsPath(wsName, backlinkPath, noteWsPaths),
          );
        },
        { timeout: 250 },
      );
    }
    return () => {
      if (timer !== undefined) {
        safeCancelIdleCallback(timer);
      }
    };
  }, [wsName, noteWsPaths, backlinkPath]);

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
        <span className="inline">{title}</span>
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
  backlinkPath,
  currentWsPath,
  wsName,
  noteWsPaths,
  bangleStore,
}: {
  backlinkPath: string;
  currentWsPath: string;
  wsName: string;
  noteWsPaths: string[];
  bangleStore: ReturnType<typeof useWorkspaceContext>['bangleStore'];
}) {
  const existingWsPathMatch = getMatchingWsPath(
    wsName,
    backlinkPath,
    noteWsPaths,
  );

  if (existingWsPathMatch) {
    return existingWsPathMatch;
  }

  // deal with the case if the path is a local file system style path
  if (
    currentWsPath &&
    (backlinkPath.startsWith('./') || backlinkPath.startsWith('../'))
  ) {
    const matchedWsPath = parseLocalFilePath(backlinkPath, currentWsPath);
    validateNoteWsPath(matchedWsPath);
    return matchedWsPath;
  }

  // create a new note as no existing wsPaths match
  let newWsPath = filePathToWsPath(wsName, backlinkPath);

  // Check if the user wants to create a new note in the same dir
  if (
    newNoteLocation === 'CURRENT_DIR' &&
    currentWsPath &&
    !backlinkPath.includes('/')
  ) {
    newWsPath = parseLocalFilePath(backlinkPath, currentWsPath);
  }

  validateNoteWsPath(newWsPath);

  await createNote(newWsPath, { open: false })(
    bangleStore.state,
    bangleStore.dispatch,
    bangleStore,
  );
  return newWsPath;
}

export const renderReactNodeView: RenderReactNodeView = {
  [backlinkNodeName]: ({ nodeViewRenderArg }) => {
    const { path, title } = nodeViewRenderArg.node.attrs;
    if (typeof path !== 'string') {
      return <span>Invalid Path</span>;
    }
    return (
      <BacklinkNode nodeAttrs={{ path, title }} view={nodeViewRenderArg.view} />
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
        const { fileName } = resolvePath(w, true);
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
