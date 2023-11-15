import './style.css';

import { defaultTheme, Flex, Provider, View } from '@adobe/react-spectrum';
import { StoreProvider, useTrack } from '@nalanda/react';
import React from 'react';

import { EternalVarsWindow } from '@bangle.io/shared-types';
import { sliceUI } from '@bangle.io/slice-ui';
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

  const titlebar = (
    <div className="bg-colorBgLayerFloat w-full">I am titlebar</div>
  );

  const mainContent = (
    <Flex
      direction="column"
      height="100%"
      UNSAFE_style={{
        overflow: 'scroll',
      }}
    >
      <div
        style={
          widescreen
            ? {
                // overflow: 'scroll',
              }
            : {}
        }
      >
        <View backgroundColor="celery-600" height="size-800" />
        <View backgroundColor="blue-600" height="size-800" />
        <View backgroundColor="magenta-600" height="size-800" />
        <View backgroundColor="magenta-600" height="size-800" />
        <View backgroundColor="magenta-600" height="size-800" />
        <View backgroundColor="magenta-600" height="size-800" />
        <View backgroundColor="magenta-600" height="size-800" />
        <View backgroundColor="celery-600" height="size-800" />
        <View backgroundColor="blue-600" height="size-800" />
        <View backgroundColor="magenta-600" height="size-800" />
        <View backgroundColor="magenta-600" height="size-800" />
        <View backgroundColor="magenta-600" height="size-800" />
        <View backgroundColor="magenta-600" height="size-800" />
        <View backgroundColor="magenta-600" height="size-800" />
        <View backgroundColor="celery-600" height="size-800" />
        <View backgroundColor="blue-600" height="size-800" />
        <View backgroundColor="magenta-600" height="size-800" />
        <View backgroundColor="magenta-600" height="size-800" />
        <View backgroundColor="magenta-600" height="size-800" />
        <View backgroundColor="magenta-600" height="size-800" />
        <View backgroundColor="magenta-600" height="size-800" />
        <View backgroundColor="celery-600" height="size-800" />
        <View backgroundColor="blue-600" height="size-800" />
        <View backgroundColor="magenta-600" height="size-800" />
        <View backgroundColor="magenta-600" height="size-800" />
        <View backgroundColor="magenta-600" height="size-800" />
        <View backgroundColor="magenta-600" height="size-800" />
        <View backgroundColor="magenta-600" height="size-800" />
        <View backgroundColor="celery-600" height="size-800" />
        <View backgroundColor="blue-600" height="size-800" />
        <View backgroundColor="magenta-600" height="size-800" />
        <View backgroundColor="magenta-600" height="size-800" />
        <View backgroundColor="magenta-600" height="size-800" />
        <View backgroundColor="magenta-600" height="size-800" />
        <View backgroundColor="magenta-600" height="size-800" />
        <View backgroundColor="celery-600" height="size-800" />
        <View backgroundColor="blue-600" height="size-800" />
        <View backgroundColor="magenta-600" height="size-800" />
        <View backgroundColor="magenta-600" height="size-800" />
        <View backgroundColor="magenta-600" height="size-800" />
        <View backgroundColor="magenta-600" height="size-800" />
        <View backgroundColor="magenta-600" height="size-800" />
        <View backgroundColor="celery-600" height="size-800" />
        <View backgroundColor="blue-600" height="size-800" />
        <View backgroundColor="magenta-600" height="size-800" />
        <View backgroundColor="magenta-600" height="size-800" />
        <View backgroundColor="magenta-600" height="size-800" />
        <View backgroundColor="magenta-600" height="size-800" />
        <View backgroundColor="magenta-600" height="size-800" />
        <View backgroundColor="celery-600" height="size-800" />
        <View backgroundColor="blue-600" height="size-800" />
        <View backgroundColor="magenta-600" height="size-800" />
        <View backgroundColor="magenta-600" height="size-800" />
        <View backgroundColor="magenta-600" height="size-800" />
        <View backgroundColor="magenta-600" height="size-800" />
        <View backgroundColor="magenta-600" height="size-800" />
      </div>
    </Flex>
  );

  if (widescreen) {
    return (
      <DhanchaWidescreen
        activitybar={
          <div
            style={{
              backgroundColor: 'green',
              height: '100%',
            }}
          >
            A
          </div>
        }
        mainContent={mainContent}
        leftAside={<div>Left aside</div>}
        rightAside={<div>Right aside</div>}
        titlebar={titlebar}
      />
    );
  }

  return <DhanchaSmallscreen mainContent={mainContent} titlebar={titlebar} />;
}
