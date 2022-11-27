import path from 'node:path';
import { defineConfig } from 'windicss/helpers';

import { topLevelDirs } from '@bangle.io/yarn-workspace-helpers';

export default defineConfig({
  plugins: [],
  theme: {
    extend: {
      colors: {
        // kushan: 'var(--BV-severity-success-color)',
      },
    },
  },
  extract: {
    include: [
      ...topLevelDirs.map((r) =>
        path.join(__dirname, `./${r}/**/*.{js,jsx,ts,tsx}`),
      ),
    ],
  },
});
