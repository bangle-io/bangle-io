import { defineConfig } from 'unocss';

import banglePreset from '@bangle.io/uno-preset-bangle';

export default defineConfig({
  include: [/\.ts$/, /\.tsx$/, /index\.html$/],

  presets: [banglePreset()],
});
