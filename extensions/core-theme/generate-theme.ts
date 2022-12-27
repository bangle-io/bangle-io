import fs from 'node:fs';
import path from 'node:path';
import prettier from 'prettier';

import { createStyleSheet } from '@bangle.io/ui-theme';

const fileName = 'core-theme.css';

const cssString = formatCss(
  createStyleSheet({
    name: 'core-theme',
    colorScheme: 'light/dark',
    theme: {
      typography: {},
      color: {
        light: {},
        dark: {},
      },
    },
  }),
);

function formatCss(css: string) {
  return prettier.format(css, {
    parser: 'css',
  });
}

fs.writeFileSync(path.join(__dirname, fileName), cssString, 'utf8');

fs.writeFileSync(
  path.join(__dirname, '..', '..', 'tooling', 'public', fileName),
  cssString,
  'utf8',
);
