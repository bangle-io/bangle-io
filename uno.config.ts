import { defineConfig } from 'unocss';

import banglePreset from '@bangle.io/uno-preset-bangle';

export default defineConfig({
  include: [/\.ts$/, /\.tsx$/],

  presets: [banglePreset()],
});
