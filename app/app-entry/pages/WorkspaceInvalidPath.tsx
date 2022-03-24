import React from 'react';

import { useSerialOperationContext } from '@bangle.io/api';
import { useBangleStoreContext } from '@bangle.io/bangle-store-context';
import {
  CORE_OPERATIONS_NEW_WORKSPACE,
  CorePalette,
} from '@bangle.io/constants';
import { togglePaletteType } from '@bangle.io/slice-ui';
import { ActionButton, ButtonContent } from '@bangle.io/ui-bangle-button';
import { CenteredBoxedPage } from '@bangle.io/ui-components';

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
          <ActionButton
            ariaLabel="open another workspace"
            onPress={() => {
              togglePaletteType(CorePalette.Workspace)(
                bangleStore.state,
                bangleStore.dispatch,
              );
            }}
          >
            <ButtonContent text="Switch workspace" />
          </ActionButton>
          <ActionButton
            ariaLabel="new workspace"
            onPress={() => {
              dispatchSerialOperation({
                name: CORE_OPERATIONS_NEW_WORKSPACE,
              });
            }}
          >
            <ButtonContent text="New workspace" />
          </ActionButton>
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
