import React from 'react';
import { useParams } from 'react-router-dom';

import { useActionContext } from '@bangle.io/action-context';
import {
  CORE_ACTIONS_NEW_WORKSPACE,
  CORE_PALETTES_TOGGLE_WORKSPACE_PALETTE,
} from '@bangle.io/constants';
import { ActionButton } from '@bangle.io/ui-bangle-button';
import { ButtonContent } from '@bangle.io/ui-bangle-button/ButtonContent';
import { CenteredBoxedPage, Page } from '@bangle.io/ui-components';

import { WorkspaceSpan } from './WorkspaceNeedsAuth';

export function WorkspaceNotFound({}) {
  const { wsName } = useParams();
  const { dispatchAction } = useActionContext();

  return (
    <CenteredBoxedPage
      title={
        <span className="font-normal">
          <WorkspaceSpan wsName={wsName} emoji={'🕵️‍♀️'} />{' '}
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
        href="https://github.com/bangle-io/bangle-io-issues/issues/new"
      >
        Github
      </a>
    </CenteredBoxedPage>
  );
}
