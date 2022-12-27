import '@unocss/reset/tailwind.css';

import 'uno.css';
import '@bangle.io/core-theme/core-theme.css';

import './storybook.css';
import '../../public/main.css';
import { themes } from '@storybook/theming';
import {
  listenToResize,
  setRootWidescreenClass,
  checkWidescreen,
  applyTheme,
} from '@bangle.io/utils';
import { useEffect, createElement } from 'react';

// set the class needed to switch between mobile/desktop ui
setRootWidescreenClass();
listenToResize((obj) => {
  setRootWidescreenClass(checkWidescreen(obj.width));
}, new AbortController().signal);

export const parameters = {
  layout: 'centered',
  actions: { argTypesRegex: '^on[A-Z].*' },
  controls: {
    matchers: {
      color: /(background|color)$/i,
      date: /Date$/,
    },
  },
};

const defaultTheme = 'light';
setTheme(defaultTheme);

function setTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme);
  if (theme === 'dark') {
    document.body.classList.remove('light-theme');
    document.body.classList.add('dark-theme');
  } else {
    document.body.classList.remove('dark-theme');
    document.body.classList.add('light-theme');
  }
}

export const globalTypes = {
  theme: {
    name: 'Theme',
    description: 'Global theme for components',
    defaultValue: defaultTheme,
    toolbar: {
      icon: 'circlehollow',
      // Array of plain string values or MenuItem shape (see below)
      items: ['light', 'dark'],
      // Property that specifies if the name of the item will be displayed
      name: true,
      // Change title based on selected value
      dynamicTitle: true,
    },
  },
};

const withThemeProvider = (Story, context) => {
  useEffect(() => {
    setTheme(context.globals.theme);
  }, [context.globals.theme]);
  return createElement(Story, null);
};
export const decorators = [withThemeProvider];
