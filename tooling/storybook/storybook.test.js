/**
 * @jest-environment jsdom
 */
import initStoryshots from '@storybook/addon-storyshots';

initStoryshots({
  framework: 'react',
  configPath: require('path').join(__dirname, '.storybook'),
});
