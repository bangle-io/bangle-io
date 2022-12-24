import fs from 'node:fs';
import path from 'node:path';

import { createStyleSheet } from '@bangle.io/ui-theme';

const fileName = 'core-theme.css';

const cssString = createStyleSheet({
  name: 'core-theme',
  color: {
    light: {},
    dark: {},
  },
});

fs.writeFileSync(path.join(__dirname, fileName), cssString, 'utf8');

fs.writeFileSync(
  path.join(__dirname, '..', '..', 'tooling', 'public', fileName),
  cssString,
  'utf8',
);
