import { createStyleSheet } from '../create-stylesheet';
import { createTokens } from '../create-tokens';

test('creates a stylesheet', () => {
  let result = createStyleSheet({
    name: 'core-theme-test',
    border: {},
    color: {},
  });
  expect(result).toMatchSnapshot();
});

test('is able to override color stylesheet', () => {
  let original = createStyleSheet({
    name: 'core-theme-test',
    border: {},
    color: {
      caution: {},
    },
  });

  expect(original).toContain('--BV-color-caution-icon: rgb(203, 93, 0);');

  let override = createStyleSheet({
    name: 'core-theme-test',
    border: {},
    color: {
      caution: {
        icon: 'red',
      },
    },
  });
  expect(override).toContain('--BV-color-caution-icon: red;');
});

describe('createTokens', () => {
  test('creates tokens correctly', () => {
    const result = createTokens({
      name: 'core-theme-test',
      border: {},
      color: {
        dark: {
          app: {
            activitybarBg: 'test-create-tokens',
          },
        },
        light: {
          caution: {},
        },
      },
    });

    expect(result).toMatchSnapshot();
  });

  test('is able to override only light', () => {
    let override = createTokens({
      name: 'core-theme-test',
      border: {},
      color: {
        dark: {
          caution: {},
        },
        light: {
          caution: {
            icon: 'light-red',
          },
        },
      },
    });

    if (!Array.isArray(override)) {
      throw new Error('Expected an array');
    }

    const lightResult = override[0];
    const darkResult = override[1];

    expect(lightResult.color.caution.icon).toContain('light-red');
    expect(darkResult.color.caution.icon).toContain('rgb(232, 116, 0)');
  });

  test('is able to app', () => {
    let override = createTokens({
      name: 'core-theme-test',
      border: {},
      color: {
        dark: {
          app: {
            activitybarBg: 'activitybar-dark-red',
          },
        },
        light: {
          caution: {},
        },
      },
    });

    if (!Array.isArray(override)) {
      throw new Error('Expected an array');
    }

    const lightResult = override[0];
    const darkResult = override[1];

    expect(darkResult.color.app.activitybarBg).toContain(
      'activitybar-dark-red',
    );
    expect(lightResult.color.app.activitybarBg).toContain('rgb(26, 32, 44)');
  });
});
