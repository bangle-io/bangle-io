import React from 'react';

import { workspace } from '@bangle.io/api';
import { useBangleStoreContext } from '@bangle.io/bangle-store-context';
import { CorePalette } from '@bangle.io/constants';
import { togglePaletteType } from '@bangle.io/slice-ui';
import { ActionButton, ButtonContent } from '@bangle.io/ui-bangle-button';
import { CenteredBoxedPage } from '@bangle.io/ui-components';

import { WorkspaceSpan } from './WorkspaceNeedsAuth';

export function WorkspaceNotFound({ wsName }: { wsName?: string }) {
  // wsName can't be read here from the store because it is not found
  const bangleStore = useBangleStoreContext();

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
              workspace.openNewWorkspaceDialog()(
                bangleStore.state,
                bangleStore.dispatch,
              );
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
