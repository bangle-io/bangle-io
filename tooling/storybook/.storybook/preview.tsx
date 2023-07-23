import '@unocss/reset/tailwind.css';
import 'virtual:uno.css';
import '@bangle.io/core-theme/core-theme.css';

import type { Preview } from '@storybook/react';

const withThemeProvider = (Story, context) => {
  const theme = context.globals.themeSwitcher;
  return (
    <div className={theme === 'light' ? 'light-scheme' : 'dark-scheme'}>
      <Story />
    </div>
  );
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
  },
};

export default preview;
