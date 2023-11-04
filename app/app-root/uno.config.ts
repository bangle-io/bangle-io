// @bangle-ignore-checks

import banglePreset from '@bangle.io/uno-preset-bangle';
import { defineConfig } from 'unocss';

const config: any = defineConfig({
  content: {
    pipeline: {
      include: [/\.ts$/, /\.tsx$/, /index\.html$/],
    },
  },
  presets: [banglePreset()],
});

export default config;
