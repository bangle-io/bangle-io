import { Extension } from '@bangle.io/extension-registry';

const extension = Extension.create({
  name: '@bangle.io/core-theme',
  themes: [
    {
      name: 'core-theme',
      url: 'https://cdn.jsdelivr.net/gh/bangle-io/bangle-io/extensions/core-theme/core-theme.css',
    },
  ],
});

export default extension;
