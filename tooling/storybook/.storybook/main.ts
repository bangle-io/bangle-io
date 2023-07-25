import path from 'path';
import Unocss from '@unocss/vite';
import { mergeConfig } from 'vite';
import getEnvVars from '@bangle.io/env-vars';

import type { StorybookConfig } from '@storybook/react-vite';
import { ALL_TOP_LEVEL_DIRS } from '@bangle.io/yarn-workspace-helpers';

const config: StorybookConfig = {
  stories: [
    ...ALL_TOP_LEVEL_DIRS.map(
      (dir) => `../../../${dir}/**/*.stories.@(js|jsx|ts|tsx)`,
    ),
  ],
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
  framework: {
    name: path.dirname(
      require.resolve(path.join('@storybook/react-vite', 'package.json')),
    ),
    options: {},
  },
  docs: {
    autodocs: 'tag',
  },
  core: {
    builder: '@storybook/builder-vite',
  },

  async viteFinal(config, { configType }) {
    const isProduction = configType === 'PRODUCTION';

    const envVars = await getEnvVars({
      isProduction: isProduction,
      isVite: true,
      isStorybook: true,
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
