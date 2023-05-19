import React from 'react';

import { vars } from '@bangle.io/api';
import { PopupEditor } from '@bangle.io/editor';
import { useExtensionRegistryContext } from '@bangle.io/extension-registry';
import type { WsPath } from '@bangle.io/shared-types';

export const LinkPreview = React.forwardRef<
  HTMLDivElement,
  {
    disablePreview: boolean;
    positionProps: Parameters<
      typeof PopupEditor
    >[0]['popupContainerProps']['positionProps'];
    style?: React.CSSProperties;
    wsPath: WsPath;
  }
>(({ positionProps, wsPath, style }, ref) => {
  const extensionRegistry = useExtensionRegistryContext();

  return (
    <PopupEditor
      ref={ref}
      editorProps={{
        extensionRegistry,
        wsPath: wsPath,
      }}
      popupContainerProps={{
        style: {
          // setting width and height are important otherwise
          // tippy confuses and causes issue with scroll
          ...style,
          width: vars.misc.miniEditorWidth,
          height: 400,
        },
        className:
          'B-inline-backlink_popup-editor z-popup border-1 border-solid border-colorNeutralBorder shadow-2xl',
        positionProps: positionProps,
      }}
    />
  );
});
