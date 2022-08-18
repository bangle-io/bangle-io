/**
 * @jest-environment @bangle.io/jsdom-env
 */
import initStoryshots from '@storybook/addon-storyshots';

jest.mock('@react-aria/ssr/dist/main', () => ({
  ...jest.requireActual('@react-aria/ssr/dist/main'),
  // react aria generates a bunch of random ids, this
  // makes the snapshot stable.
  useSSRSafeId: () => 'react-aria-test-generated-id',
}));

initStoryshots({
  framework: 'react',
  configPath: require('path').join(__dirname, '.storybook'),
});
