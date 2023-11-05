import type { StorybookConfig } from '@storybook/react-vite';
import Unocss from '@unocss/vite';
import path from 'node:path';
import { mergeConfig } from 'vite';

import getEnvVars from '@bangle.io/env-vars';

const publicDir = path.join(
  path.dirname(require.resolve('@bangle.io/app-root')),
  'public',
);

const config: StorybookConfig = {
  stories: [`../../../**/*.stories.@(ts|tsx)`],
  staticDirs: ['../../../app-bundler/app-root/public'],
  previewHead: (head) => `
  ${head}
  <link rel="stylesheet" href="/auto-generated/core-theme.css" />
`,
  addons: [
    path.dirname(
      require.resolve(path.join('@storybook/addon-links', 'package.json')),
    ),
    path.dirname(
      require.resolve(path.join('@storybook/addon-essentials', 'package.json')),
    ),
    path.dirname(
      require.resolve(path.join('@storybook/addon-onboarding', 'package.json')),
    ),
    path.dirname(
      require.resolve(path.join('@storybook/addon-viewport', 'package.json')),
    ),
    path.dirname(
      require.resolve(
        path.join('@storybook/addon-interactions', 'package.json'),
      ),
    ),
  ],
  framework: '@storybook/react-vite',
  docs: {
    autodocs: 'tag',
  },
  core: {
    builder: '@storybook/builder-vite',
  },

  viteFinal(config, { configType }) {
    const isProduction = configType === 'PRODUCTION';

    const envVars = getEnvVars({
      isProduction: isProduction,
      isVite: true,
      isStorybook: true,
      publicDirPath: publicDir,
      helpDocsVersion: 'latest',
    });

    return mergeConfig(config, {
      plugins: [Unocss()],
      define: {
        ...envVars.appEnvs,
      },
    });
  },
};
export default config;
