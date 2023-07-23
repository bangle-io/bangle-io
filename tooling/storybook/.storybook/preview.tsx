import '@unocss/reset/tailwind.css';
import 'virtual:uno.css';
import '@bangle.io/core-theme/core-theme.css';
import React from 'react';
import type { Decorator, Preview } from '@storybook/react';
import { useLayoutEffect } from 'react';
const withThemeProvider: Decorator = (Story, context) => {
  const theme = context.globals.themeSwitcher;
  useLayoutEffect(() => {
    const body = document.body;
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
      },
      defaultViewport: 'responsive',
    },
  },
};

export default preview;
