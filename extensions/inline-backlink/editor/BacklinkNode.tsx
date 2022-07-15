import React, { useEffect, useState } from 'react';

import type { EditorState } from '@bangle.dev/pm';

import { EditorDisplayType } from '@bangle.io/constants';
import type { RenderReactNodeView } from '@bangle.io/extension-registry';
import { useWorkspaceContext } from '@bangle.io/slice-workspace';
import { useHover, useTooltipPositioner } from '@bangle.io/ui-bangle-button';
import { getEditorPluginMetadata } from '@bangle.io/utils';

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
  // TODO currently bangle.dev doesn't pass editorview context so we are
  // unable to use `useEditorPluginMetadata` which itself uses `useEditorViewContext`
  // which will be undefined for react nodeviews.
  const { wsPath: currentWsPath, editorDisplayType } =
    getEditorPluginMetadata(editorState);

  const { wsName, noteWsPaths, bangleStore } = useWorkspaceContext();

  let { path: wikiLink, title } = nodeAttrs;
  title = title || wikiLink;

  const onClick = useOnClickBacklink({
    wikiLink,
    currentWsPath,
    editorState,
  });

  const [backlinksWsPath, updateBacklinksWsPath] = useState<string | undefined>(
    undefined,
  );

  const disablePopup = editorDisplayType === EditorDisplayType.Popup;

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
      updateBacklinksWsPath(
        calcWikiLinkMapping(noteWsPaths, getAllWikiLinks(editorState)).get(
          wikiLink,
        ),
      );
    }
  }, [wsName, noteWsPaths, wikiLink, editorState]);

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
