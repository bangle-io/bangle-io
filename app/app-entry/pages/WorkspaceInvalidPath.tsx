import React from 'react';

import { useSerialOperationContext } from '@bangle.io/api';
import { useBangleStoreContext } from '@bangle.io/bangle-store-context';
import {
  CORE_OPERATIONS_NEW_WORKSPACE,
  CorePalette,
} from '@bangle.io/constants';
import { togglePaletteType } from '@bangle.io/slice-ui';
import { Button, CenteredBoxedPage } from '@bangle.io/ui-components';

export function WorkspaceInvalidPath() {
  const bangleStore = useBangleStoreContext();
  const { dispatchSerialOperation } = useSerialOperationContext();

  return (
    <CenteredBoxedPage
      title={
        <span className="font-normal">
          <span className="pl-1">🙈 Invalid path</span>
        </span>
      }
      actions={
        <>
          <Button
            ariaLabel="open another workspace"
            text="Switch workspace"
            onPress={() => {
              togglePaletteType(CorePalette.Workspace)(
                bangleStore.state,
                bangleStore.dispatch,
              );
            }}
          />

          <Button
            ariaLabel="new workspace"
            onPress={() => {
              dispatchSerialOperation({
                name: CORE_OPERATIONS_NEW_WORKSPACE,
              });
            }}
            text="New workspace"
          />
        </>
      }
    >
      <span>If this is a mistake please create a bug report at </span>
      <a
        target="_blank"
        rel="noreferrer"
        className="font-extrabold underline"
        href="https://github.com/bangle-io/bangle-io/issues/new"
      >
        Github
      </a>
    </CenteredBoxedPage>
  );
}
