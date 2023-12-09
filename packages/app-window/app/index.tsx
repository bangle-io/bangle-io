import './style.css';

import { darkTheme, lightTheme, Provider } from '@adobe/react-spectrum';
import { StoreProvider, useStore, useTrack } from '@nalanda/react';
import React, { useEffect } from 'react';

import { Activitybar } from '@bangle.io/activitybar';
import { appErrorHandler } from '@bangle.io/app-error-handler';
import { Router } from '@bangle.io/app-routing';
import { COLOR_SCHEME } from '@bangle.io/constants';
import { DialogArea } from '@bangle.io/dialogs';
import { LeftAside } from '@bangle.io/left-aside';
import { MainContent } from '@bangle.io/main-content';
import { RightAside } from '@bangle.io/right-aside';
import { EternalVarsWindow } from '@bangle.io/shared-types';
import { queueToast, sliceUI } from '@bangle.io/slice-ui';
import { Titlebar } from '@bangle.io/titlebar';
import { DhanchaSmallscreen, DhanchaWidescreen } from '@bangle.io/ui';
import { createWindowStore } from '@bangle.io/window-store';

import { ToastArea } from './components/ToastArea';
import { logger } from './logger';

let store: ReturnType<typeof createWindowStore>;

export function App({ eternalVars }: { eternalVars: EternalVarsWindow }) {
  if (eternalVars?.debugFlags.testShowAppRootReactError) {
    throw new Error('This is debug Test react error!');
  }

  // even though react can remount the app, we want to keep the store
  // around as it is a singleton
  if (!store) {
    store = createWindowStore(eternalVars, {});
  }

  const isDark = sliceUI.get(store.state).colorScheme === COLOR_SCHEME.DARK;

  return (
    <Provider
      colorScheme={isDark ? 'dark' : 'light'}
      theme={isDark ? darkTheme : lightTheme}
    >
      <StoreProvider store={store}>
        <Router>
          <ToastArea />
          <DialogArea />
          <Main />
        </Router>
      </StoreProvider>
    </Provider>
  );
}

function Main() {
  const { widescreen, showLeftAside, showRightAside, showActivitybar } =
    useTrack(sliceUI);

  const store = useStore();

  useEffect(() => {
    const handleRejection = (event: PromiseRejectionEvent | ErrorEvent) => {
      const handle = (error: Error) => {
        return appErrorHandler(
          error,
          (dialog) => {
            store.dispatch(
              sliceUI.actions.showDialog(dialog.name, dialog.payload),
            );
          },
          (toast) => {
            queueToast(store, toast);
          },
        );
      };

      if ('reason' in event) {
        let error = event.reason;
        if (handle(error)) {
          logger.debug(error.cause);
          logger.debug('Handled rejection', error);
          event.preventDefault();
        }
      } else {
        let error = event.error;
        if (handle(error)) {
          logger.debug(error.cause);
          logger.debug('Handled error', error);
          event.preventDefault();
        }
      }
    };

    window.addEventListener('error', handleRejection);
    window.addEventListener('unhandledrejection', handleRejection);
    return () => {
      window.removeEventListener('unhandledrejection', handleRejection);
      window.removeEventListener('error', handleRejection);
    };
  }, [store]);

  if (widescreen) {
    return (
      <DhanchaWidescreen
        activitybar={showActivitybar && <Activitybar />}
        mainContent={<MainContent />}
        leftAside={showLeftAside && <LeftAside />}
        rightAside={showRightAside && <RightAside />}
        titlebar={<Titlebar />}
      />
    );
  }

  return (
    <DhanchaSmallscreen mainContent={<MainContent />} titlebar={<Titlebar />} />
  );
}
