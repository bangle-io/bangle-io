import './style.css';

import { darkTheme, lightTheme, Provider } from '@adobe/react-spectrum';
import { StoreProvider, useTrack } from '@nalanda/react';
import React from 'react';

import { Activitybar } from '@bangle.io/activitybar';
import { COLOR_SCHEME } from '@bangle.io/constants';
import { LeftAside } from '@bangle.io/left-aside';
import { MainContent } from '@bangle.io/main-content';
import { RightAside } from '@bangle.io/right-aside';
import { EternalVarsWindow } from '@bangle.io/shared-types';
import { sliceUI } from '@bangle.io/slice-ui';
import { Titlebar } from '@bangle.io/titlebar';
import { DhanchaSmallscreen, DhanchaWidescreen } from '@bangle.io/ui';
import { createWindowStore } from '@bangle.io/window-store';
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
      theme={isDark ? darkTheme : lightTheme}
      defaultColorScheme={isDark ? 'dark' : 'light'}
    >
      <StoreProvider store={store}>
        <Main />
      </StoreProvider>
    </Provider>
  );
}

function Main() {
  const { widescreen, showLeftAside, showRightAside, showActivitybar } =
    useTrack(sliceUI);

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
