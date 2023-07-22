import { defineConfig } from 'unocss';

import banglePreset from '@bangle.io/uno-preset-bangle';

export default defineConfig({
  content: {
    pipeline: {
      include: [/\.ts$/, /\.tsx$/, /index\.html$/],
    },
  },
  presets: [banglePreset()],
});
