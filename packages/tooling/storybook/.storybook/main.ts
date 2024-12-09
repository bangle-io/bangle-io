import path from 'node:path';
import getEnvVars from '@bangle.io/env-vars';
import type { StorybookConfig } from '@storybook/react-vite';
import type { StoriesEntry } from '@storybook/types';
import { globby } from 'globby';

const globbyIgnore = ['**/node_modules/**', '**/dist/**', '**/build/**'];
const root = path.resolve(__dirname, '../../../..');

// There is some bug in storybook where it gets stuck in infinite loop
async function findStories(): Promise<StoriesEntry[]> {
  const stories = await globby('**/*.stories.*', {
    cwd: path.join(root, 'packages'),
    absolute: true,
    gitignore: true,
    ignore: globbyIgnore,
  });
  const groupedStories: { [packageName: string]: StoriesEntry } = {};

  stories.forEach((story) => {
    // Normalize the path based on OS (to ensure correct path separators)
    const normalizedStory = path.normalize(story);

    // Extract the part of the path after 'packages'
    const relativePath = path.relative(
      path.join(root, 'packages'),
      normalizedStory,
    );

    // Split the relative path to get the group and package name
    const pathParts = relativePath.split(path.sep);
    const group = pathParts[0]; // the group folder
    const packageName = pathParts[1]; // the package name

    const fullPackageName = `${group}/${packageName}`;

    if (!group || !packageName) {
      return;
    }

    if (!groupedStories[fullPackageName]) {
      groupedStories[fullPackageName] = {
        directory: path.join(root, 'packages', group, packageName, 'src'),
        titlePrefix: `${group}/${packageName}`,
      };
    }
  });

  // Convert the grouped stories object to an array
  return Object.values(groupedStories);
}

const config: StorybookConfig = {
  stories: async (list = []) => {
    const storyList = await findStories();
    console.log('Stories Found', [...list, ...storyList]);
    return [...list, ...storyList];
  },
  addons: [
    '@storybook/addon-onboarding',
    '@storybook/addon-links',
    '@storybook/addon-essentials',
    '@chromatic-com/storybook',
    '@storybook/addon-interactions',
  ],
  framework: {
    name: '@storybook/react-vite',
    options: {},
  },
  async viteFinal(config, { configType }) {
    const { mergeConfig } = await import('vite');

    const envVars = getEnvVars({
      isProduction: configType === 'PRODUCTION',
      isVite: true,
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
