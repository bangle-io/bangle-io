import {
  createSmallScreenOverride,
  createStyleSheetObj,
  CSS_BODY,
  CSS_DARK_SCHEME,
  CSS_LIGHT_SCHEME,
  CSS_ROOT,
  CSS_SM_BODY,
  CSS_SM_DARK_SCHEME,
  CSS_SM_LIGHT_SCHEME,
} from '../create-stylesheet';

const defaultSheetSingle = createStyleSheetObj({
  colorScheme: 'single',
  name: 'core-theme-test',
  theme: {
    color: {},
  },
});

const defaultObjDualColorScheme = createStyleSheetObj({
  colorScheme: 'light/dark',
  name: 'core-theme-test',
  theme: {},
});

describe('default', () => {
  test('sets correct keys', () => {
    let result = createStyleSheetObj({
      colorScheme: 'single',
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
        colorScheme: 'single',
        name: 'core-theme-test',
        theme: {
          color: {},
        },
      }),
    ).toEqual(defaultSheetSingle);
    expect(
      createStyleSheetObj({
        colorScheme: 'light/dark',
        name: 'core-theme-test',
        theme: {},
      }),
    ).toEqual(defaultObjDualColorScheme);
  });

  test('sets body', () => {
    let result = createStyleSheetObj({
      colorScheme: 'single',
      name: 'core-theme-test',
      theme: {
        color: {},
      },
    });

    expect(result[CSS_BODY]).toMatchSnapshot();
  });

  test('sets root', () => {
    let result = createStyleSheetObj({
      colorScheme: 'single',
      name: 'core-theme-test',
      theme: {
        color: {},
      },
    });

    expect(result[CSS_ROOT]).toMatchSnapshot();
  });

  test('sets sm override', () => {
    let result = createStyleSheetObj({
      colorScheme: 'single',
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
    colorScheme: 'light/dark',
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
      CSS_LIGHT_SCHEME,
      CSS_DARK_SCHEME,
      CSS_SM_LIGHT_SCHEME,
      CSS_SM_DARK_SCHEME,
    ]);
  });

  test('sets root content', () => {
    expect(result[CSS_ROOT]).toMatchSnapshot();
  });

  test('sets light dark content', () => {
    expect(result[CSS_DARK_SCHEME]).toMatchSnapshot();
    expect(result[CSS_LIGHT_SCHEME]).toMatchSnapshot();
  });

  test('sets sm override', () => {
    expect(result[CSS_SM_DARK_SCHEME]).toMatchInlineSnapshot(`
      [
        "--BV-colorAppActivitybarBg: rgb(14, 14, 14);",
        "--BV-miscPagePadding: 1.5rem 10px 2rem 25px;",
      ]
    `);
    expect(result[CSS_SM_LIGHT_SCHEME]).toMatchInlineSnapshot(`
      [
        "--BV-colorAppActivitybarBg: rgb(255, 255, 255);",
        "--BV-colorAppActivitybarText: rgb(34, 34, 34);",
        "--BV-miscPagePadding: 1.5rem 10px 2rem 25px;",
      ]
    `);
  });
});

describe('overrides', () => {
  test('is able to override color stylesheet', () => {
    let original = createStyleSheetObj({
      colorScheme: 'single',
      name: 'core-theme-test',
      theme: {
        color: {
          caution: {},
        },
      },
    });

    expect(original[CSS_ROOT]).toContain(
      '--BV-colorCautionIcon: rgb(203, 93, 0);',
    );

    let override = createStyleSheetObj({
      colorScheme: 'single',
      name: 'core-theme-test',
      theme: {
        color: {
          caution: {
            icon: 'red',
          },
        },
      },
    });
    expect(override[CSS_ROOT]).toContain('--BV-colorCautionIcon: red;');
  });

  test('overrides light/dark', () => {
    let original = createStyleSheetObj({
      colorScheme: 'light/dark',
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

    expect(original[CSS_ROOT]).not.toContain('--BV-colorCautionIcon: red;');
    expect(original[CSS_DARK_SCHEME]).toContain(
      '--BV-colorCautionIcon: dark-red;',
    );
    expect(original[CSS_LIGHT_SCHEME]).toContain(
      '--BV-colorCautionIcon: light-red;',
    );
  });

  test('is able to override only light', () => {
    let override = createStyleSheetObj({
      colorScheme: 'light/dark',
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
      '--BV-colorCautionIcon:',
    );

    expect(override[CSS_DARK_SCHEME]).toContain(
      '--BV-colorCautionIcon: rgb(232, 116, 0);',
    );

    expect(override[CSS_LIGHT_SCHEME]).toContain(
      '--BV-colorCautionIcon: light-red;',
    );
  });

  test('is able to override only dark', () => {
    let override = createStyleSheetObj({
      colorScheme: 'light/dark',
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
      '--BV-colorCautionIcon:',
    );

    expect(override[CSS_DARK_SCHEME]).toContain(
      '--BV-colorCautionIcon: dark-red;',
    );

    expect(override[CSS_LIGHT_SCHEME]).toContain(
      '--BV-colorCautionIcon: rgb(203, 93, 0);',
    );
  });

  test('is able to set app', () => {
    let override = createStyleSheetObj({
      colorScheme: 'light/dark',
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
    expect(override[CSS_DARK_SCHEME]).toContain(
      '--BV-colorAppActivitybarBg: activitybar-dark-red;',
    );
    expect(override[CSS_LIGHT_SCHEME]).toContain(
      '--BV-colorAppActivitybarBg: rgb(26, 32, 44);',
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
    ).toEqual(['--BV-colorAppActivitybarBg: sm-dark-red;']);

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
      '--BV-borderRadiusMd: sm-1;',
      '--BV-colorAppActivitybarBg: sm-dark-red;',
    ]);

    expect(createSmallScreenOverride({})).toEqual([]);
  });

  test('works with no theme color', () => {
    let override = createStyleSheetObj({
      colorScheme: 'light/dark',
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
      CSS_LIGHT_SCHEME,
      CSS_DARK_SCHEME,
      CSS_SM_LIGHT_SCHEME,
      CSS_SM_DARK_SCHEME,
    ]);

    expect(override[CSS_ROOT]).toEqual(defaultObjDualColorScheme[CSS_ROOT]);
    expect(override[CSS_DARK_SCHEME]).toEqual(
      defaultObjDualColorScheme[CSS_DARK_SCHEME],
    );

    expect(override[CSS_LIGHT_SCHEME]).toEqual(
      defaultObjDualColorScheme[CSS_LIGHT_SCHEME],
    );

    expect(override[CSS_SM_LIGHT_SCHEME]).toContain(
      '--BV-colorCautionIcon: sm-light-red;',
    );

    expect(override[CSS_SM_DARK_SCHEME]).toContain(
      '--BV-colorCautionIcon: sm-dark-red;',
    );
  });

  test('works with radius', () => {
    let override = createStyleSheetObj({
      colorScheme: 'light/dark',
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
      CSS_LIGHT_SCHEME,
      CSS_DARK_SCHEME,
      CSS_SM_LIGHT_SCHEME,
      CSS_SM_DARK_SCHEME,
    ]);

    expect(override[CSS_ROOT]).toEqual(defaultObjDualColorScheme[CSS_ROOT]);
    expect(override[CSS_DARK_SCHEME]).toEqual(
      defaultObjDualColorScheme[CSS_DARK_SCHEME],
    );

    expect(override[CSS_LIGHT_SCHEME]).toEqual(
      defaultObjDualColorScheme[CSS_LIGHT_SCHEME],
    );

    expect(override[CSS_SM_LIGHT_SCHEME]).toContain(
      '--BV-borderRadiusMd: nanty;',
    );

    expect(override[CSS_SM_DARK_SCHEME]).toContain(
      '--BV-borderRadiusMd: nanty;',
    );
  });

  test('works with theme colors', () => {
    let override = createStyleSheetObj({
      colorScheme: 'light/dark',
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
      CSS_LIGHT_SCHEME,
      CSS_DARK_SCHEME,
      CSS_SM_LIGHT_SCHEME,
      CSS_SM_DARK_SCHEME,
    ]);

    expect(override[CSS_ROOT]).not.toContain('--BV-colorCautionIcon: red;');
    expect(override[CSS_DARK_SCHEME]).toContain(
      '--BV-colorCautionIcon: dark-red;',
    );
    expect(override[CSS_LIGHT_SCHEME]).toContain(
      '--BV-colorCautionIcon: light-red;',
    );

    expect(override[CSS_SM_LIGHT_SCHEME]).toContain(
      '--BV-colorCautionIcon: sm-light-red;',
    );

    expect(override[CSS_SM_DARK_SCHEME]).toContain(
      '--BV-colorCautionIcon: sm-dark-red;',
    );
  });

  test('is able to set app', () => {
    let override = createStyleSheetObj({
      colorScheme: 'light/dark',
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

    expect(override[CSS_DARK_SCHEME]).toContain(
      '--BV-colorAppActivitybarBg: activitybar-dark-red;',
    );
    expect(override[CSS_LIGHT_SCHEME]).toContain(
      '--BV-colorAppActivitybarBg: rgb(26, 32, 44);',
    );
    expect(override[CSS_SM_DARK_SCHEME]).toContain(
      '--BV-colorAppActivitybarBg: sm-activitybar-dark-red;',
    );

    expect(override[CSS_SM_LIGHT_SCHEME]).toContain(
      '--BV-colorAppActivitybarBg: rgb(255, 255, 255);',
    );

    // other overrides should be there
    expect(override[CSS_SM_LIGHT_SCHEME]?.length).toBeGreaterThan(1);
  });
});
