import './style.css';

import { darkTheme, lightTheme, Provider } from '@adobe/react-spectrum';
import { StoreProvider, useStore, useTrack } from '@nalanda/react';
import React, { useEffect } from 'react';

import { Activitybar } from '@bangle.io/activitybar';
import { Router } from '@bangle.io/app-routing';
import { BaseError } from '@bangle.io/base-error';
import { COLOR_SCHEME } from '@bangle.io/constants';
import { LeftAside } from '@bangle.io/left-aside';
import { MainContent } from '@bangle.io/main-content';
import { RightAside } from '@bangle.io/right-aside';
import { EternalVarsWindow } from '@bangle.io/shared-types';
import { queueToast, sliceUI } from '@bangle.io/slice-ui';
import { Titlebar } from '@bangle.io/titlebar';
import { DhanchaSmallscreen, DhanchaWidescreen } from '@bangle.io/ui';
import { createWindowStore } from '@bangle.io/window-store';

import { ToastArea } from './components/ToastArea';

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
    const handleRejection = (error: PromiseRejectionEvent) => {
      let label = 'Encountered an error';

      if (error.reason instanceof BaseError) {
        label = error.reason.message;
      } else if (error.reason instanceof Error) {
        label = error.reason.name;
      }

      queueToast(store, {
        label,
        type: 'negative',
      });
    };

    window.addEventListener('unhandledrejection', handleRejection);
    return () => {
      window.removeEventListener('unhandledrejection', handleRejection);
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
