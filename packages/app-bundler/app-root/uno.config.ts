// @bangle-ignore-checks

import { defineConfig } from 'unocss';

import banglePreset from '@bangle.io/uno-preset-bangle';

const config: any = defineConfig({
  content: {
    pipeline: {
      include: [/\.ts$/, /\.tsx$/, /index\.html$/],
    },
  },
  presets: [banglePreset()],
});

export default config;
