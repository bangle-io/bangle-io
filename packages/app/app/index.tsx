import './style.css';

import { defaultTheme, Provider } from '@adobe/react-spectrum';
import { StoreProvider, useTrack } from '@nalanda/react';
import React from 'react';

import { sliceUI } from '@bangle.io/slice-ui';
import { Dhancha } from '@bangle.io/ui';

import { store } from './store';

export function App() {
  return (
    <StoreProvider store={store}>
      <Provider theme={defaultTheme}>
        <Main />
      </Provider>
    </StoreProvider>
  );
}

function Main() {
  const { colorScheme, widescreen } = useTrack(sliceUI);
  console.log({
    colorScheme,
    widescreen,
  });
  return (
    <Dhancha
      widescreen={widescreen}
      activitybar={<div onClick={() => {}}>Activitybar</div>}
      mainContent={<div>Main content</div>}
      noteSidebar={<div>Note</div>}
      workspaceSidebar={<div>Workspace sidebar</div>}
    />
  );
}
