import React, { useEffect, useState } from 'react';

import type { EditorState } from '@bangle.dev/pm';

import { nsmApi2 } from '@bangle.io/api';
import { EditorDisplayType } from '@bangle.io/constants';
import { getEditorPluginMetadata } from '@bangle.io/editor-common';
import type { RenderReactNodeView } from '@bangle.io/extension-registry';
import type { WsPath } from '@bangle.io/shared-types';
import { useHover, useTooltipPositioner } from '@bangle.io/ui-components';

import { BacklinkNodeButton } from '../BacklinkNodeButton';
import { calcWikiLinkMapping, getAllWikiLinks } from '../calculate-matches';
import { backlinkNodeName } from '../config';
import { LinkPreview } from './LinkPreview';
import { useOnClickBacklink } from './use-on-click-backlink';

export function BacklinkNode({
  nodeAttrs,
  editorState,
}: {
  nodeAttrs: { path: string; title?: string };
  editorState: EditorState;
}) {
  const { wsPath: currentWsPath, editorDisplayType } =
    getEditorPluginMetadata(editorState);

  const { wsName, noteWsPaths } = nsmApi2.workspace.useWorkspace();

  let { path: wikiLink, title } = nodeAttrs;
  title = title || wikiLink;

  const onClick = useOnClickBacklink({
    wikiLink,
    currentWsPath,
    editorState,
  });

  const [backlinksWsPath, updateBacklinksWsPath] = useState<WsPath | undefined>(
    undefined,
  );

  const disablePopup = editorDisplayType === EditorDisplayType.Floating;

  const [isHovered, updateIsHovered] = useState(false);
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
    delay: 450,
    immediateClose: false,
  });

  useEffect(() => {
    if (noteWsPaths) {
      const result = calcWikiLinkMapping(
        noteWsPaths,
        getAllWikiLinks(editorState),
      ).get(wikiLink);

      updateBacklinksWsPath(result);
    }
  }, [wsName, noteWsPaths, wikiLink, editorState]);

  useEffect(() => {
    let targetWsPath = backlinksWsPath;
    let didSet = false;

    if (targetWsPath && isTooltipVisible) {
      didSet = true;
      nsmApi2.workspace.pushOpenedWsPath((openedWsPaths) => {
        return openedWsPaths.updatePopupEditorWsPath(targetWsPath);
      });
    }

    return () => {
      if (didSet) {
        nsmApi2.workspace.pushOpenedWsPath((openedWsPaths) => {
          // make sure we are unsetting the correct wsPath
          if (
            targetWsPath &&
            targetWsPath === openedWsPaths.popupEditorWsPath
          ) {
            return openedWsPaths.updatePopupEditorWsPath(undefined);
          }

          return openedWsPaths;
        });
      }
    };
  }, [backlinksWsPath, isTooltipVisible]);

  return (
    <>
      <BacklinkNodeButton
        ref={setTriggerElement}
        linkNotFound={!backlinksWsPath}
        title={title}
        onClick={onClick}
        onHoverChange={updateIsHovered}
      />
      {isTooltipVisible && backlinksWsPath && (
        <LinkPreview
          disablePreview={disablePopup}
          positionProps={{ ...tooltipHoverProps, ...tooltipProps.attributes }}
          ref={setTooltipElement}
          style={tooltipProps.style}
          wsPath={backlinksWsPath}
        />
      )}
    </>
  );
}

export const renderReactNodeView: RenderReactNodeView = {
  [backlinkNodeName]: ({ nodeViewRenderArg }) => {
    const { path, title } = nodeViewRenderArg.node.attrs;

    if (typeof path !== 'string') {
      return <span>Invalid Path</span>;
    }

    return (
      <BacklinkNode
        nodeAttrs={{ path, title }}
        editorState={nodeViewRenderArg.view.state}
      />
    );
  },
};
