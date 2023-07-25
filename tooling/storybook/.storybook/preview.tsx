import '@bangle.io/app-entry/style';
import '@bangle.io/core-theme/core-theme.css';

import React from 'react';
import type { Decorator, Preview } from '@storybook/react';
import { useLayoutEffect } from 'react';
import { checkWidescreen } from '@bangle.io/utils';
const withThemeProvider: Decorator = (Story, context) => {
  const theme = context.globals.themeSwitcher;
  useLayoutEffect(() => {
    const body = document.body;
    body.classList.remove('BU_widescreen', 'BU_smallscreen');
    body.classList.add(checkWidescreen() ? 'BU_widescreen' : 'BU_smallscreen');
    if (theme === 'light') {
      body.classList.remove('dark-scheme');
      body.classList.add('light-scheme');
    } else {
      body.classList.add('dark-scheme');
      body.classList.remove('light-scheme');
    }
  }, [theme]);
  return <Story />;
};

const preview: Preview = {
  decorators: [withThemeProvider],
  globalTypes: {
    themeSwitcher: {
      description: 'Global theme switcher',
      defaultValue: 'light',
      toolbar: {
        title: 'Theme',
        icon: 'circlehollow',
        items: ['light', 'dark'],
        dynamicTitle: true,
      },
    },
  },
  parameters: {
    actions: { argTypesRegex: '^on[A-Z].*' },
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/,
      },
    },
    // see test-utils where this is used to set the NsmStore
    nsmContextKey: {
      nsmContextKey: 'used for getting the store from the context',
    },
    viewport: {
      viewports: {
        smallscreen: {
          name: 'smallscreen',
          styles: {
            height: '844px',
            width: '390px',
          },
          type: 'mobile',
        },
        ipad: {
          name: 'iPad',
          styles: {
            height: '1024px',
            width: '768px',
          },
          type: 'tablet',
        },
        responsive: {
          name: 'responsive',
          type: 'desktop',
          styles: {
            width: '100%',
            height: '100%',
            border: 0,
            margin: 0,
            boxShadow: 'none',
            borderRadius: 0,
            position: 'absolute',
          },
        },
      },
      defaultViewport: 'responsive',
    },
  },
};

export default preview;
