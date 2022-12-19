import fs from 'node:fs';
import path from 'node:path';

import { coreThemeDark } from './core-theme-dark';
import { coreThemeLight } from './core-theme-light';

const cssString = coreThemeLight + '\n\n' + coreThemeDark;

const fileName = 'core-theme.css';

fs.writeFileSync(path.join(__dirname, fileName), cssString, 'utf8');

fs.writeFileSync(
  path.join(__dirname, '..', '..', 'tooling', 'public', fileName),
  cssString,
  'utf8',
);
