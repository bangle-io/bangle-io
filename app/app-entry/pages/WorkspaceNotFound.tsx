import React from 'react';

import { useSerialOperationContext } from '@bangle.io/api';
import { useBangleStoreContext } from '@bangle.io/bangle-store-context';
import {
  CORE_OPERATIONS_NEW_WORKSPACE,
  CorePalette,
} from '@bangle.io/constants';
import { togglePaletteType } from '@bangle.io/slice-ui';
import { Button, CenteredBoxedPage } from '@bangle.io/ui-components';

import { WorkspaceSpan } from './WorkspaceNeedsAuth';

export function WorkspaceNotFound({ wsName }: { wsName?: string }) {
  // wsName can't be read here from the store because it is not found
  const bangleStore = useBangleStoreContext();
  const { dispatchSerialOperation } = useSerialOperationContext();

  wsName = decodeURIComponent(wsName || '');

  return (
    <CenteredBoxedPage
      title={
        <span className="font-normal">
          <WorkspaceSpan wsName={wsName || ''} emoji={'🕵️‍♀️'} />{' '}
          <span className="pl-1"> not found</span>
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
            text="New workspace"
            onPress={() => {
              dispatchSerialOperation({
                name: CORE_OPERATIONS_NEW_WORKSPACE,
              });
            }}
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
