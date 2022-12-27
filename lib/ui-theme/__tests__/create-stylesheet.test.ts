import {
  createSmallScreenOverride,
  createStyleSheetObj,
  CSS_BODY,
  CSS_DARK_THEME,
  CSS_LIGHT_THEME,
  CSS_ROOT,
  CSS_SM_BODY,
  CSS_SM_DARK_THEME,
  CSS_SM_LIGHT_THEME,
} from '../create-stylesheet';

const defaultSheetSingle = createStyleSheetObj({
  type: 'single',
  name: 'core-theme-test',
  theme: {
    color: {},
  },
});

const defaultObjLightDark = createStyleSheetObj({
  type: 'light/dark',
  name: 'core-theme-test',
  theme: {},
});

describe('default', () => {
  test('sets correct keys', () => {
    let result = createStyleSheetObj({
      type: 'single',
      name: 'core-theme-test',
      theme: {
        color: {},
      },
    });

    expect(Object.keys(result)).toEqual([CSS_BODY, CSS_ROOT, CSS_SM_BODY]);
  });

  test('matches with the default', () => {
    expect(
      createStyleSheetObj({
        type: 'single',
        name: 'core-theme-test',
        theme: {
          color: {},
        },
      }),
    ).toEqual(defaultSheetSingle);
    expect(
      createStyleSheetObj({
        type: 'light/dark',
        name: 'core-theme-test',
        theme: {},
      }),
    ).toEqual(defaultObjLightDark);
  });

  test('sets body', () => {
    let result = createStyleSheetObj({
      type: 'single',
      name: 'core-theme-test',
      theme: {
        color: {},
      },
    });

    expect(result[CSS_BODY]).toMatchSnapshot();
  });

  test('sets root', () => {
    let result = createStyleSheetObj({
      type: 'single',
      name: 'core-theme-test',
      theme: {
        color: {},
      },
    });

    expect(result[CSS_ROOT]).toMatchSnapshot();
  });

  test('sets sm override', () => {
    let result = createStyleSheetObj({
      type: 'single',
      name: 'core-theme-test',
      theme: {
        color: {},
      },
    });

    expect(result[CSS_SM_BODY]).toMatchSnapshot();
  });
});

describe('default light/dark', () => {
  let result = createStyleSheetObj({
    type: 'light/dark',
    name: 'core-theme-test',
    theme: {
      color: {
        light: {},
        dark: {},
      },
    },
  });

  test('sets keys correctly in light/dark', () => {
    expect(Object.keys(result)).toEqual([
      CSS_BODY,
      CSS_ROOT,
      CSS_LIGHT_THEME,
      CSS_DARK_THEME,
      CSS_SM_LIGHT_THEME,
      CSS_SM_DARK_THEME,
    ]);
  });

  test('sets root content', () => {
    expect(result[CSS_ROOT]).toMatchSnapshot();
  });

  test('sets light dark content', () => {
    expect(result[CSS_DARK_THEME]).toMatchSnapshot();
    expect(result[CSS_LIGHT_THEME]).toMatchSnapshot();
  });

  test('sets sm override', () => {
    expect(result[CSS_SM_DARK_THEME]).toMatchInlineSnapshot(`
      [
        "--BV-color-app-activitybarBg: rgb(14, 14, 14);",
      ]
    `);
    expect(result[CSS_SM_LIGHT_THEME]).toMatchInlineSnapshot(`
      [
        "--BV-color-app-activitybarBg: rgb(255, 255, 255);",
        "--BV-color-app-activitybarText: rgb(34, 34, 34);",
      ]
    `);
  });
});

describe('overrides', () => {
  test('is able to override color stylesheet', () => {
    let original = createStyleSheetObj({
      type: 'single',
      name: 'core-theme-test',
      theme: {
        color: {
          caution: {},
        },
      },
    });

    expect(original[CSS_ROOT]).toContain(
      '--BV-color-caution-icon: rgb(203, 93, 0);',
    );

    let override = createStyleSheetObj({
      type: 'single',
      name: 'core-theme-test',
      theme: {
        color: {
          caution: {
            icon: 'red',
          },
        },
      },
    });
    expect(override[CSS_ROOT]).toContain('--BV-color-caution-icon: red;');
  });

  test('overrides light/dark', () => {
    let original = createStyleSheetObj({
      type: 'light/dark',
      name: 'core-theme-test',
      theme: {
        color: {
          dark: {
            caution: {
              icon: 'dark-red',
            },
          },
          light: {
            caution: {
              icon: 'light-red',
            },
          },
        },
      },
    });

    expect(original[CSS_ROOT]).not.toContain('--BV-color-caution-icon: red;');
    expect(original[CSS_DARK_THEME]).toContain(
      '--BV-color-caution-icon: dark-red;',
    );
    expect(original[CSS_LIGHT_THEME]).toContain(
      '--BV-color-caution-icon: light-red;',
    );
  });

  test('is able to override only light', () => {
    let override = createStyleSheetObj({
      type: 'light/dark',
      name: 'core-theme-test',
      theme: {
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
      },
    });

    expect(override[CSS_ROOT]?.join(',')).not.toContain(
      '--BV-color-caution-icon:',
    );

    expect(override[CSS_DARK_THEME]).toContain(
      '--BV-color-caution-icon: rgb(232, 116, 0);',
    );

    expect(override[CSS_LIGHT_THEME]).toContain(
      '--BV-color-caution-icon: light-red;',
    );
  });

  test('is able to override only dark', () => {
    let override = createStyleSheetObj({
      type: 'light/dark',
      name: 'core-theme-test',
      theme: {
        color: {
          dark: {
            caution: {
              icon: 'dark-red',
            },
          },
          light: {},
        },
      },
    });

    expect(override[CSS_ROOT]?.join(',')).not.toContain(
      '--BV-color-caution-icon:',
    );

    expect(override[CSS_DARK_THEME]).toContain(
      '--BV-color-caution-icon: dark-red;',
    );

    expect(override[CSS_LIGHT_THEME]).toContain(
      '--BV-color-caution-icon: rgb(203, 93, 0);',
    );
  });

  test('is able to set app', () => {
    let override = createStyleSheetObj({
      type: 'light/dark',
      name: 'core-theme-test',
      theme: {
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
      },
    });
    expect(override[CSS_DARK_THEME]).toContain(
      '--BV-color-app-activitybarBg: activitybar-dark-red;',
    );
    expect(override[CSS_LIGHT_THEME]).toContain(
      '--BV-color-app-activitybarBg: rgb(26, 32, 44);',
    );
  });
});

describe('smallscreen overrides', () => {
  test('createSmallScreenOverride', () => {
    expect(
      createSmallScreenOverride({
        color: {
          app: {
            activitybarBg: 'sm-dark-red',
          },
        },
      }),
    ).toEqual(['--BV-color-app-activitybarBg: sm-dark-red;']);

    expect(
      createSmallScreenOverride({
        color: {
          app: {
            activitybarBg: 'sm-dark-red',
          },
        },

        border: {
          radius: {
            md: 'sm-1',
          },
        },
      }),
    ).toEqual([
      '--BV-border-radius-md: sm-1;',
      '--BV-color-app-activitybarBg: sm-dark-red;',
    ]);

    expect(createSmallScreenOverride({})).toEqual([]);
  });

  test('works with no theme color', () => {
    let override = createStyleSheetObj({
      type: 'light/dark',
      name: 'core-theme-test',
      theme: {},
      smallscreenOverride: {
        color: {
          dark: {
            caution: {
              icon: 'sm-dark-red',
            },
          },
          light: {
            caution: {
              icon: 'sm-light-red',
            },
          },
        },
      },
    });

    expect(Object.keys(override)).toEqual([
      CSS_BODY,
      CSS_ROOT,
      CSS_LIGHT_THEME,
      CSS_DARK_THEME,
      CSS_SM_LIGHT_THEME,
      CSS_SM_DARK_THEME,
    ]);

    expect(override[CSS_ROOT]).toEqual(defaultObjLightDark[CSS_ROOT]);
    expect(override[CSS_DARK_THEME]).toEqual(
      defaultObjLightDark[CSS_DARK_THEME],
    );

    expect(override[CSS_LIGHT_THEME]).toEqual(
      defaultObjLightDark[CSS_LIGHT_THEME],
    );

    expect(override[CSS_SM_LIGHT_THEME]).toContain(
      '--BV-color-caution-icon: sm-light-red;',
    );

    expect(override[CSS_SM_DARK_THEME]).toContain(
      '--BV-color-caution-icon: sm-dark-red;',
    );
  });

  test('works with radius', () => {
    let override = createStyleSheetObj({
      type: 'light/dark',
      name: 'core-theme-test',
      theme: {},
      smallscreenOverride: {
        border: {
          radius: {
            md: 'nanty',
          },
        },
      },
    });

    expect(Object.keys(override)).toEqual([
      CSS_BODY,
      CSS_ROOT,
      CSS_LIGHT_THEME,
      CSS_DARK_THEME,
      CSS_SM_LIGHT_THEME,
      CSS_SM_DARK_THEME,
    ]);

    expect(override[CSS_ROOT]).toEqual(defaultObjLightDark[CSS_ROOT]);
    expect(override[CSS_DARK_THEME]).toEqual(
      defaultObjLightDark[CSS_DARK_THEME],
    );

    expect(override[CSS_LIGHT_THEME]).toEqual(
      defaultObjLightDark[CSS_LIGHT_THEME],
    );

    expect(override[CSS_SM_LIGHT_THEME]).toContain(
      '--BV-border-radius-md: nanty;',
    );

    expect(override[CSS_SM_DARK_THEME]).toContain(
      '--BV-border-radius-md: nanty;',
    );
  });

  test('works with theme colors', () => {
    let override = createStyleSheetObj({
      type: 'light/dark',
      name: 'core-theme-test',
      theme: {
        color: {
          dark: {
            caution: {
              icon: 'dark-red',
            },
          },
          light: {
            caution: {
              icon: 'light-red',
            },
          },
        },
      },
      smallscreenOverride: {
        color: {
          dark: {
            caution: {
              icon: 'sm-dark-red',
            },
          },
          light: {
            caution: {
              icon: 'sm-light-red',
            },
          },
        },
      },
    });

    expect(Object.keys(override)).toEqual([
      CSS_BODY,
      CSS_ROOT,
      CSS_LIGHT_THEME,
      CSS_DARK_THEME,
      CSS_SM_LIGHT_THEME,
      CSS_SM_DARK_THEME,
    ]);

    expect(override[CSS_ROOT]).not.toContain('--BV-color-caution-icon: red;');
    expect(override[CSS_DARK_THEME]).toContain(
      '--BV-color-caution-icon: dark-red;',
    );
    expect(override[CSS_LIGHT_THEME]).toContain(
      '--BV-color-caution-icon: light-red;',
    );

    expect(override[CSS_SM_LIGHT_THEME]).toContain(
      '--BV-color-caution-icon: sm-light-red;',
    );

    expect(override[CSS_SM_DARK_THEME]).toContain(
      '--BV-color-caution-icon: sm-dark-red;',
    );
  });

  test('is able to set app', () => {
    let override = createStyleSheetObj({
      type: 'light/dark',
      name: 'core-theme-test',
      theme: {
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
      },
      smallscreenOverride: {
        color: {
          dark: {
            app: {
              activitybarBg: 'sm-activitybar-dark-red',
            },
          },
        },
      },
    });
    expect(override[CSS_DARK_THEME]).toContain(
      '--BV-color-app-activitybarBg: activitybar-dark-red;',
    );
    expect(override[CSS_LIGHT_THEME]).toContain(
      '--BV-color-app-activitybarBg: rgb(26, 32, 44);',
    );
    expect(override[CSS_SM_DARK_THEME]).toContain(
      '--BV-color-app-activitybarBg: sm-activitybar-dark-red;',
    );

    expect(override[CSS_SM_LIGHT_THEME]).toContain(
      '--BV-color-app-activitybarBg: rgb(255, 255, 255);',
    );

    // other overrides should be there
    expect(override[CSS_SM_LIGHT_THEME]?.length).toBeGreaterThan(1);
  });
});
