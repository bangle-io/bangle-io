import React, { useCallback } from 'react';

import { useSerialOperationContext, workspace } from '@bangle.io/api';
import { PopupEditor } from '@bangle.io/editor';
import { useExtensionRegistryContext } from '@bangle.io/extension-registry';
import type { BangleApplicationStore } from '@bangle.io/shared-types';

export const LinkPreview = React.forwardRef<
  HTMLDivElement,
  {
    bangleStore: BangleApplicationStore;
    disablePreview: boolean;
    positionProps: Parameters<
      typeof PopupEditor
    >[0]['popupContainerProps']['positionProps'];
    style?: React.CSSProperties;
    wsPath: string;
  }
>(({ positionProps, bangleStore, wsPath, style }, ref) => {
  const extensionRegistry = useExtensionRegistryContext();
  const { dispatchSerialOperation } = useSerialOperationContext();

  const getDocument = useCallback(
    (wsPath: string) => {
      return workspace
        .getNote(wsPath)(bangleStore.state, bangleStore.dispatch, bangleStore)
        .then(
          (doc) => {
            return doc;
          },
          (err) => {
            return undefined;
          },
        );
    },
    [bangleStore],
  );

  return (
    <PopupEditor
      ref={ref}
      editorProps={{
        wsPath: wsPath,
        bangleStore,
        getDocument,
        extensionRegistry,
        dispatchSerialOperation,
      }}
      popupContainerProps={{
        style: style,
        className: 'B-inline-backlink_popup-editor',
        positionProps: positionProps,
      }}
    />
  );
});
