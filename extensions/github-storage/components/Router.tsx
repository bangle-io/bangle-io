import React from 'react';

import {
  useBangleStoreContext,
  useSerialOperationHandler,
} from '@bangle.io/api';

import {
  OPERATION_NEW_GITHUB_WORKSPACE,
  OPERATION_UPDATE_GITHUB_TOKEN,
} from '../common';
import { updateGithubToken } from '../operations';
import { RepoPicker } from './RepoPicker';
import { TokenInput } from './TokenInput';

export function Router() {
  const [route, _updateRoute] = React.useState<
    'repo-picker' | 'token-update' | undefined
  >(undefined);
  const bangleStore = useBangleStoreContext();

  useSerialOperationHandler((sOperation) => {
    // if (sOperation.name === 'garbag') {
    //   if (
    //     window.confirm(
    //       'Creating a Github workspace is experimental and may not work as expected. Continue?',
    //     )
    //   ) {
    //     _updateRoute('repo-picker');
    //   }

    //   return true;
    // }

    // if (sOperation.name === OPERATION_UPDATE_GITHUB_TOKEN) {
    //   _updateRoute('token-update');

    //   return true;
    // }

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
