import React from 'react';

import { PopupEditor } from '@bangle.io/editor';
import { useExtensionRegistryContext } from '@bangle.io/extension-registry';

export const LinkPreview = React.forwardRef<
  HTMLDivElement,
  {
    disablePreview: boolean;
    positionProps: Parameters<
      typeof PopupEditor
    >[0]['popupContainerProps']['positionProps'];
    style?: React.CSSProperties;
    wsPath: string;
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
        style: style,
        className: 'B-inline-backlink_popup-editor',
        positionProps: positionProps,
      }}
    />
  );
});
