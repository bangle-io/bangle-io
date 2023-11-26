import type { StorybookConfig } from '@storybook/react-vite';
import Unocss from '@unocss/vite';
import path from 'node:path';
import { mergeConfig } from 'vite';

import getEnvVars from '@bangle.io/env-vars';
// eslint-disable-next-line @typescript-eslint/no-var-requires
const HELP_DOCS_VERSION = require('bangle-io-help/package.json').version;

const publicDir = path.join(
  path.dirname(require.resolve('@bangle.io/app-root')),
  'public',
);

const globbyIgnore = ['**/node_modules/**', '**/dist/**', '**/build/**'];
const root = path.resolve(__dirname, '../../../..');

// There is some bug in storybook where it gets stuck in infinite loop
async function findStories(): Promise<StorybookConfig['stories']> {
  const { globby } = await import('globby');
  const stories = await globby('**/*.stories.*', {
    cwd: path.join(root, 'packages'),
    absolute: true,
    gitignore: true,
    ignore: globbyIgnore,
  });

  console.debug('Found stories', stories);

  return stories;
}

const config: StorybookConfig = {
  // @ts-expect-error - TODO: fix this
  stories: async (list = []) => [...list, ...(await findStories())],
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
      helpDocsVersion: HELP_DOCS_VERSION,
    });

    return mergeConfig(config, {
      plugins: [Unocss({})],
      define: {
        ...envVars.globalIdentifiers,
      },
    });
  },
};
export default config;
