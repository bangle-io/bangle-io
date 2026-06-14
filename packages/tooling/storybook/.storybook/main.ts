import path from 'node:path';
import { fileURLToPath } from 'node:url';
import getEnvVars from '@bangle.io/env-vars';
import type { StorybookConfig } from '@storybook/react-vite';
import type { StoriesEntry } from 'storybook/internal/types';
import type { InlineConfig } from 'vite';

const root = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '../../../..',
);

const stories: StoriesEntry[] = [
  {
    directory: path.join(root, 'packages/ui/shadcn/src'),
    titlePrefix: 'ui/shadcn',
  },
  {
    directory: path.join(root, 'packages/ui/ui-components/src'),
    titlePrefix: 'ui/ui-components',
  },
  {
    directory: path.join(root, 'packages/tooling/storybook/src'),
    titlePrefix: 'tooling/storybook',
  },
];

const config: StorybookConfig = {
  stories,
  addons: [
    '@storybook/addon-onboarding',
    '@storybook/addon-links',
    '@chromatic-com/storybook',
  ],
  framework: {
    name: '@storybook/react-vite',
    options: {},
  },
  async viteFinal(
    config: InlineConfig,
    { configType }: { configType?: 'DEVELOPMENT' | 'PRODUCTION' },
  ) {
    const { mergeConfig } = await import('vite');

    const envVars = getEnvVars({
      isProduction: configType === 'PRODUCTION',
      isStorybook: true,
      helpDocsVersion: '0.0.0',
    });

    return mergeConfig(config, {
      define: {
        ...envVars.globalIdentifiers,
      },
    });
  },
};
export default config;
