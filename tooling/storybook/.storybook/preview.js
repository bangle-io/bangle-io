import 'windi.css';
import './storybook.css';
import '../../public/main.css';
import { themes } from '@storybook/theming';
import {
  listenToResize,
  setRootWidescreenClass,
  checkWidescreen,
} from '@bangle.io/utils';

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
