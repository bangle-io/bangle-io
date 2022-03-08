import React from 'react';

import { useBangleStoreContext } from '@bangle.io/bangle-store-context';
import { ApplicationStore } from '@bangle.io/create-store';
import { useSerialOperationHandler } from '@bangle.io/serial-operation-context';
import { showNotification } from '@bangle.io/slice-notification';
import {
  getWorkspaceType,
  getWsName,
  updateWorkspaceMetadata,
} from '@bangle.io/slice-workspace';

import {
  GITHUB_STORAGE_PROVIDER_NAME,
  OPERATION_NEW_GITHUB_WORKSPACE,
  OPERATION_UPDATE_GITHUB_TOKEN,
} from '../common';
import { RepoPicker } from './RepoPicker';
import { TokenInput } from './TokenInput';

export function Router() {
  const [route, _updateRoute] = React.useState<
    'repo-picker' | 'token-update' | undefined
  >(undefined);
  const bangleStore = useBangleStoreContext();

  useSerialOperationHandler((sOperation) => {
    if (sOperation.name === OPERATION_NEW_GITHUB_WORKSPACE) {
      if (
        window.confirm(
          'Creating a Github workspace is experimental and may not work as expected. Continue?',
        )
      ) {
        _updateRoute('repo-picker');
      }
      return true;
    }

    if (sOperation.name === OPERATION_UPDATE_GITHUB_TOKEN) {
      _updateRoute('token-update');
      return true;
    }

    return false;
  }, []);
  const onDismiss = React.useCallback(() => {
    _updateRoute(undefined);
  }, []);

  switch (route) {
    case 'repo-picker': {
      return <RepoPicker onDismiss={onDismiss} />;
    }

    case 'token-update': {
      return (
        <TokenInput
          onDismiss={onDismiss}
          updateToken={(token: string) => {
            updateGithubToken(token)(bangleStore.state, bangleStore.dispatch);
            _updateRoute(undefined);
          }}
        />
      );
    }

    default: {
      return null;
    }
  }
}

const updateGithubToken =
  (token: string) =>
  (
    state: ApplicationStore['state'],
    dispatch: ApplicationStore['dispatch'],
  ) => {
    const wsName = getWsName()(state);
    if (
      wsName &&
      getWorkspaceType(wsName)(state) === GITHUB_STORAGE_PROVIDER_NAME
    ) {
      updateWorkspaceMetadata(wsName, (existing) => {
        if (existing.githubToken !== token) {
          return {
            ...existing,
            githubToken: token,
          };
        }
        return existing;
      })(state, dispatch);
      showNotification({
        uid: 'success-update-github-token',
        title: 'Github successfully token updated',
        severity: 'success',
      })(state, dispatch);
      return true;
    }

    showNotification({
      uid: 'failure-update-github-token-no-wsname',
      title: 'Github token not updated',
      content: 'Please open a Github workspace before updating the token.',
      severity: 'error',
    })(state, dispatch);
    return false;
  };
