import { Extension } from '@bangle.io/extension-registry';

const extension = Extension.create({
  name: '@bangle.io/core-theme',
  theme: {
    url: {
      light:
        'https://cdn.jsdelivr.net/gh/bangle-io/bangle-io/extensions/core-theme/theme-light.css',
      dark: 'https://cdn.jsdelivr.net/gh/bangle-io/bangle-io/extensions/core-theme/theme-dark.css',
    },
  },
});

export default extension;
