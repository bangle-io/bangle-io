import React from 'react';

import { useActionContext } from '@bangle.io/action-context';
import {
  CORE_ACTIONS_NEW_WORKSPACE,
  CORE_PALETTES_TOGGLE_WORKSPACE_PALETTE,
} from '@bangle.io/constants';
import { ActionButton, ButtonContent } from '@bangle.io/ui-bangle-button';
import { CenteredBoxedPage } from '@bangle.io/ui-components';
import { useWorkspaceContext } from '@bangle.io/workspace-context';

import { WorkspaceSpan } from './WorkspaceNeedsAuth';

export function WorkspaceNotFound({}) {
  // TODO wsNamae can't be read here
  const { dispatchAction } = useActionContext();

  return (
    <CenteredBoxedPage
      title={
        <span className="font-normal">
          <WorkspaceSpan wsName={''} emoji={'🕵️‍♀️'} />{' '}
          <span className="pl-1">not found</span>
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
        href="https://github.com/bangle-io/bangle-io/issues/issues/new"
      >
        Github
      </a>
    </CenteredBoxedPage>
  );
}
