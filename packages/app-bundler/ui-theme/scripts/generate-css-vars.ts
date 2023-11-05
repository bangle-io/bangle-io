import fs from 'node:fs';
import path from 'node:path';
import prettier from 'prettier';

import { createStyleSheet } from '../index';

const fileName = 'core-theme.css';

const sSheet = createStyleSheet({
  name: 'core-theme',
  type: 'dual',
  darkTheme: {},
  lightTheme: {},
});

function formatCss(css: string) {
  return prettier.format(css, {
    parser: 'css',
    singleQuote: true,
  });
}

export default async function main() {
  return formatCss(sSheet).then((cssString) => {
    fs.writeFileSync(
      path.join(
        path.dirname(require.resolve('@bangle.io/app-root')),
        'public',
        'auto-generated',
        fileName,
      ),
      cssString,
      'utf8',
    );
  });
}

if (require.main === module) {
  void main();
}
