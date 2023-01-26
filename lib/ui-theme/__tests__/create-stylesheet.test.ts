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
  type: 'single',
  name: 'core-theme-test',
  theme: {
    color: {},
  },
});

const defaultObjDualColorScheme = createStyleSheetObj({
  type: 'dual',
  name: 'core-theme-test',
  lightTheme: {},
  darkTheme: {},
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
        theme: {},
      }),
    ).toEqual(defaultSheetSingle);
    expect(
      createStyleSheetObj({
        type: 'dual',
        name: 'core-theme-test',
        lightTheme: {},
        darkTheme: {},
      }),
    ).toEqual(defaultObjDualColorScheme);
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
    type: 'dual',
    name: 'core-theme-test',
    darkTheme: {},
    lightTheme: {},
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
        "--BV-miscActivitybarBg: rgb(14, 14, 14);",
        "--BV-miscActivitybarText: rgb(70, 70, 70);",
        "--BV-miscPagePadding: 1.5rem 10px 2rem 25px;",
      ]
    `);
    expect(result[CSS_SM_LIGHT_SCHEME]).toMatchInlineSnapshot(`
      [
        "--BV-miscActivitybarBg: rgb(255, 255, 255);",
        "--BV-miscActivitybarText: rgb(34, 34, 34);",
        "--BV-miscPagePadding: 1.5rem 10px 2rem 25px;",
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
      '--BV-colorCautionIcon: rgb(203, 93, 0);',
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
    expect(override[CSS_ROOT]).toContain('--BV-colorCautionIcon: red;');
  });

  test('overrides light/dark', () => {
    let original = createStyleSheetObj({
      type: 'dual',
      name: 'core-theme-test',
      darkTheme: {
        color: {
          caution: {
            icon: 'dark-red',
          },
        },
      },
      lightTheme: {
        color: {
          caution: {
            icon: 'light-red',
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
      type: 'dual',
      name: 'core-theme-test',
      lightTheme: {
        color: {
          caution: {
            icon: 'light-red',
          },
        },
      },
      darkTheme: {
        color: {
          caution: {},
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
      type: 'dual',
      name: 'core-theme-test',
      lightTheme: {},
      darkTheme: {
        color: {
          caution: {
            icon: 'dark-red',
          },
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
      type: 'dual',
      name: 'core-theme-test',
      lightTheme: {},
      darkTheme: {
        misc: {
          activitybarBg: 'activitybar-dark-red',
        },
      },
    });
    expect(override[CSS_DARK_SCHEME]).toContain(
      '--BV-miscActivitybarBg: activitybar-dark-red;',
    );
    expect(override[CSS_LIGHT_SCHEME]).toContain(
      '--BV-miscActivitybarBg: rgb(26, 32, 44);',
    );
  });
});

describe('smallscreen overrides', () => {
  test('createSmallScreenOverride', () => {
    expect(
      createSmallScreenOverride({
        misc: {
          activitybarBg: 'sm-dark-red',
        },
      }),
    ).toEqual(['--BV-miscActivitybarBg: sm-dark-red;']);

    expect(
      createSmallScreenOverride({
        misc: {
          activitybarBg: 'sm-dark-red',
        },

        border: {
          radius: {
            md: 'sm-1',
          },
        },
      }),
    ).toEqual([
      '--BV-borderRadiusMd: sm-1;',
      '--BV-miscActivitybarBg: sm-dark-red;',
    ]);

    expect(createSmallScreenOverride({})).toEqual([]);
  });

  test('works with no theme color', () => {
    let override = createStyleSheetObj({
      type: 'dual',
      name: 'core-theme-test',
      lightTheme: {},
      darkTheme: {},

      lightSmallscreenOverride: {
        color: {
          caution: {
            icon: 'sm-light-red',
          },
        },
      },
      darkSmallscreenOverride: {
        color: {
          caution: {
            icon: 'sm-dark-red',
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
      type: 'dual',
      name: 'core-theme-test',
      lightTheme: {},
      darkTheme: {},
      darkSmallscreenOverride: {
        border: {
          radius: {
            md: 'nanty',
          },
        },
      },
      lightSmallscreenOverride: {
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
      type: 'dual',
      name: 'core-theme-test',
      lightTheme: {
        color: {
          caution: {
            icon: 'light-red',
          },
        },
      },
      darkTheme: {
        color: {
          caution: {
            icon: 'dark-red',
          },
        },
      },
      darkSmallscreenOverride: {
        color: {
          caution: {
            icon: 'sm-dark-red',
          },
        },
      },
      lightSmallscreenOverride: {
        color: {
          caution: {
            icon: 'sm-light-red',
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
      type: 'dual',
      name: 'core-theme-test',
      lightTheme: {},
      darkTheme: {
        misc: {
          activitybarBg: 'activitybar-dark-red',
        },
      },
      darkSmallscreenOverride: {
        misc: {
          activitybarBg: 'sm-activitybar-dark-red',
        },
      },
    });

    expect(override[CSS_DARK_SCHEME]).toContain(
      '--BV-miscActivitybarBg: activitybar-dark-red;',
    );
    expect(override[CSS_LIGHT_SCHEME]).toContain(
      '--BV-miscActivitybarBg: rgb(26, 32, 44);',
    );
    expect(override[CSS_SM_DARK_SCHEME]).toContain(
      '--BV-miscActivitybarBg: sm-activitybar-dark-red;',
    );

    expect(override[CSS_SM_LIGHT_SCHEME]).toContain(
      '--BV-miscActivitybarBg: rgb(255, 255, 255);',
    );

    // other overrides should be there
    expect(override[CSS_SM_LIGHT_SCHEME]?.length).toBeGreaterThan(1);
  });
});
