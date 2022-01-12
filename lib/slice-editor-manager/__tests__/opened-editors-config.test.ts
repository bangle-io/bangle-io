import { createEmptyArray } from '@bangle.io/utils';

import { OpenedEditorsConfig } from '../opened-editors-config';

test('works empty', () => {
  const config = new OpenedEditorsConfig({
    scrollPositions: [],
    selections: [],
  });
  expect(config).toMatchInlineSnapshot(`
    OpenedEditorsConfig {
      "scrollPositions": Array [
        null,
        null,
      ],
      "selections": Array [
        null,
        null,
      ],
    }
  `);

  expect(config.getScrollPosition('test:magic.md', 0)).toBeUndefined();
  expect(config.getScrollPosition('test:magic.md', 1)).toBeUndefined();
  expect(config.getScrollPosition('test:magic.md', undefined)).toBeUndefined();
  expect(config.getSelection('test:magic.md', 1)).toBeUndefined();
  expect(config.getSelection('test:magic.md', 0)).toBeUndefined();
  expect(config.getSelection('test:magic.md', 100)).toBeUndefined();
  expect(config.getSelection('test:magic.md', undefined)).toBeUndefined();
});

test('shrinks with bigger arrays automatically', () => {
  const config = new OpenedEditorsConfig({
    scrollPositions: createEmptyArray(1000).map((_, k) => ({
      'test:magic.md': k,
    })),
    selections: [],
  });
  expect(config).toMatchInlineSnapshot(`
    OpenedEditorsConfig {
      "scrollPositions": Array [
        Object {
          "test:magic.md": 0,
        },
        Object {
          "test:magic.md": 1,
        },
      ],
      "selections": Array [
        null,
        null,
      ],
    }
  `);

  expect(config.getScrollPosition('test:magic.md', 0)).toBe(0);
  expect(config.getScrollPosition('test:magic.md', 1)).toBe(1);
  expect(config.getScrollPosition('test:magic.md', 2)).toBeUndefined();
  expect(config.getScrollPosition('test:magic.md', 30)).toBeUndefined();
});

describe('selection', () => {
  test('updates selection of the same wsPath', () => {
    let config = OpenedEditorsConfig.fromJsonObj({
      selections: [
        {
          'test:magic.md': {
            type: 'text',
            anchor: 2004,
            head: 2004,
          },
        },
      ],
    });

    expect(config).toMatchInlineSnapshot(`
          OpenedEditorsConfig {
            "scrollPositions": Array [
              null,
              null,
            ],
            "selections": Array [
              Object {
                "test:magic.md": Object {
                  "anchor": 2004,
                  "head": 2004,
                  "type": "text",
                },
              },
              null,
            ],
          }
      `);

    expect(config.getSelection('test:magic.md', 0)).toEqual({
      anchor: 2004,
      head: 2004,
      type: 'text',
    });

    config = config.updateSelection(
      {
        anchor: 20,
        head: 25,
        type: 'text',
      },
      'test:magic.md',
      0,
    );

    expect(config.getSelection('test:magic.md', 0)).toEqual({
      anchor: 20,
      head: 25,
      type: 'text',
    });
  });

  test('setting undefined as selection', () => {
    let config = OpenedEditorsConfig.fromJsonObj({
      selections: [
        {
          'test:magic.md': {
            type: 'text',
            anchor: 20,
            head: 20,
          },
        },
      ],
    });
    config = config.updateSelection(undefined, 'test:magic.md', 0);

    expect(config.getSelection('test:magic.md', 0)).toBeUndefined();
  });

  test('updateSelection with undefined editorId keeps the same', () => {
    let config = OpenedEditorsConfig.fromJsonObj({
      selections: [
        {
          'test:magic.md': {
            type: 'text',
            anchor: 20,
            head: 20,
          },
        },
      ],
    });

    const newConfig = config.updateSelection(
      {
        anchor: 24,
        head: 24,
        type: 'text',
      },
      'test:wonder.md',
      undefined,
    );

    expect(newConfig).toBe(config);
  });

  test('updateScrollPosition with undefined editorId keeps the same', () => {
    let config = OpenedEditorsConfig.fromJsonObj({
      selections: [
        {
          'test:magic.md': {
            type: 'text',
            anchor: 20,
            head: 20,
          },
        },
      ],
    });

    const newConfig = config.updateScrollPosition(
      3,
      'test:wonder.md',
      undefined,
    );

    expect(newConfig).toBe(config);
  });

  test('updates selection of the different wsPath but same editorId', () => {
    let oldConfig = OpenedEditorsConfig.fromJsonObj({
      selections: [
        {
          'test:magic.md': {
            type: 'text',
            anchor: 20,
            head: 20,
          },
        },
      ],
    });

    expect(oldConfig.getSelection('test:wonder.md', 0)).toBe(undefined);

    let config = oldConfig.updateSelection(
      {
        anchor: 24,
        head: 24,
        type: 'text',
      },
      'test:wonder.md',
      0,
    );

    expect(config).not.toBe(oldConfig);

    expect(config.getSelection('test:magic.md', 0)).toEqual({
      anchor: 20,
      head: 20,
      type: 'text',
    });

    expect(config.getSelection('test:wonder.md', 0)).toEqual({
      anchor: 24,
      head: 24,
      type: 'text',
    });
  });

  test('updatingSelection a new editorId', () => {
    let oldConfig = OpenedEditorsConfig.fromJsonObj({});

    let config = oldConfig.updateSelection(
      {
        anchor: 24,
        head: 24,
        type: 'text',
      },
      'test:wonder.md',
      0,
    );

    expect(config).toMatchInlineSnapshot(`
      OpenedEditorsConfig {
        "scrollPositions": Array [
          null,
          null,
        ],
        "selections": Array [
          Object {
            "test:wonder.md": Object {
              "anchor": 24,
              "head": 24,
              "type": "text",
            },
          },
          null,
        ],
      }
    `);
  });
});

describe('scroll', () => {
  test('setting undefined as selection', () => {
    let config = OpenedEditorsConfig.fromJsonObj({
      selections: [
        {
          'test:magic.md': {
            type: 'text',
            anchor: 20,
            head: 20,
          },
        },
      ],
    });
    config = config.updateScrollPosition(undefined, 'test:wonder.md', 0);
    expect(config.getScrollPosition('test:magic.md', 0)).toBeUndefined();
  });
});

describe('serializing', () => {
  test('with empty values', () => {
    let config = OpenedEditorsConfig.fromJsonObj({});
    expect(config.getScrollPosition('test:magic.md', 0)).toBeUndefined();
    expect(config.getSelection('test:magic.md', 0)).toBeUndefined();
    expect(config.toJsonObj()).toEqual({
      scrollPositions: [null, null],
      selections: [null, null],
    });
  });

  test('with data', () => {
    let config = OpenedEditorsConfig.fromJsonObj({
      selections: [
        {
          'test:magic.md': {
            type: 'text',
            anchor: 20,
            head: 20,
          },
        },
      ],
    });

    config = config
      .updateScrollPosition(3, 'test:wonder.md', 1)
      .updateSelection(
        {
          anchor: 24,
          head: 24,
          type: 'text',
        },
        'test:wonder.md',
        0,
      )
      .updateScrollPosition(5, 'test:wonder2.md', 1)
      .updateScrollPosition(3, 'test:first.md', 0);

    expect(config.toJsonObj()).toEqual({
      scrollPositions: [
        {
          'test:first.md': 3,
        },
        {
          'test:wonder.md': 3,
          'test:wonder2.md': 5,
        },
      ],
      selections: [
        {
          'test:magic.md': {
            anchor: 20,
            head: 20,
            type: 'text',
          },
          'test:wonder.md': {
            anchor: 24,
            head: 24,
            type: 'text',
          },
        },
        null,
      ],
    });
  });
});
