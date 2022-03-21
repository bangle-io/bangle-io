import React from 'react';

import {
  BangleAppDispatch,
  BangleAppState,
  notification,
  useBangleStoreContext,
  useSerialOperationHandler,
  workspace,
} from '@bangle.io/api';

import {
  OPERATION_NEW_GITHUB_WORKSPACE,
  OPERATION_UPDATE_GITHUB_TOKEN,
} from '../common';
import { isGithubStorageProvider } from '../helpers';
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
  (token: string) => (state: BangleAppState, dispatch: BangleAppDispatch) => {
    const wsName = workspace.getWsName()(state);

    if (wsName && isGithubStorageProvider()(state)) {
      workspace.updateWorkspaceMetadata(wsName, (existing) => {
        if (existing.githubToken !== token) {
          return {
            ...existing,
            githubToken: token,
          };
        }

        return existing;
      })(state, dispatch);
      notification.showNotification({
        uid: 'success-update-github-token',
        title: 'Github successfully token updated',
        severity: 'success',
      })(state, dispatch);

      return true;
    }

    notification.showNotification({
      uid: 'failure-update-github-token-no-wsname',
      title: 'Github token not updated',
      content: 'Please open a Github workspace before updating the token.',
      severity: 'error',
    })(state, dispatch);

    return false;
  };
