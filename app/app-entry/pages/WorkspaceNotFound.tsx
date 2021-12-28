import React from 'react';

import { useActionContext } from '@bangle.io/action-context';
import {
  CORE_ACTIONS_NEW_WORKSPACE,
  CORE_PALETTES_TOGGLE_WORKSPACE_PALETTE,
} from '@bangle.io/constants';
import { ActionButton, ButtonContent } from '@bangle.io/ui-bangle-button';
import { CenteredBoxedPage } from '@bangle.io/ui-components';

import { WorkspaceSpan } from './WorkspaceNeedsAuth';

export function WorkspaceNotFound({ wsName }: { wsName?: string }) {
  // wsName can't be read here from the store because it is not found
  const { dispatchAction } = useActionContext();

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
              dispatchAction({
                name: CORE_PALETTES_TOGGLE_WORKSPACE_PALETTE,
              });
            }}
          >
            <ButtonContent text="Switch workspace" />
          </ActionButton>
          <ActionButton
            ariaLabel="new workspace"
            onPress={() => {
              dispatchAction({
                name: CORE_ACTIONS_NEW_WORKSPACE,
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
