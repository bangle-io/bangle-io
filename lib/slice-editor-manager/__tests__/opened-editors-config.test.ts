import {
  MAX_OPEN_EDITORS,
  MINI_EDITOR_INDEX,
  PRIMARY_EDITOR_INDEX,
  SECONDARY_EDITOR_INDEX,
} from '@bangle.io/constants';
import { createEmptyArray } from '@bangle.io/utils';

import { OpenedEditorsConfig } from '../opened-editors-config';

function createNullArray(size: number) {
  return createEmptyArray(size).map(() => null);
}

test('works empty', () => {
  const config = new OpenedEditorsConfig({
    scrollPositions: [],
    selections: [],
  });
  expect(config).toMatchInlineSnapshot(`
    OpenedEditorsConfig {
      "_scrollPositions": [
        null,
        null,
        null,
        null,
      ],
      "_selections": [
        null,
        null,
        null,
        null,
      ],
    }
  `);

  expect(
    config.getScrollPosition('test:magic.md', PRIMARY_EDITOR_INDEX),
  ).toBeUndefined();
  expect(
    config.getScrollPosition('test:magic.md', SECONDARY_EDITOR_INDEX),
  ).toBeUndefined();
  expect(
    config.getSelection('test:magic.md', SECONDARY_EDITOR_INDEX),
  ).toBeUndefined();
  expect(
    config.getSelection('test:magic.md', PRIMARY_EDITOR_INDEX),
  ).toBeUndefined();
  expect(config.getSelection('test:magic.md', 100)).toBeUndefined();
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
      "_scrollPositions": [
        {
          "test:magic.md": 0,
        },
        {
          "test:magic.md": 1,
        },
        {
          "test:magic.md": 2,
        },
        {
          "test:magic.md": 3,
        },
      ],
      "_selections": [
        null,
        null,
        null,
        null,
      ],
    }
  `);

  expect(config.getScrollPosition('test:magic.md', PRIMARY_EDITOR_INDEX)).toBe(
    0,
  );
  expect(
    config.getScrollPosition('test:magic.md', SECONDARY_EDITOR_INDEX),
  ).toBe(1);
  expect(config.getScrollPosition('test:magic.md', MINI_EDITOR_INDEX)).toBe(2);
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
        "_scrollPositions": [
          null,
          null,
          null,
          null,
        ],
        "_selections": [
          {
            "test:magic.md": {
              "anchor": 2004,
              "head": 2004,
              "type": "text",
            },
          },
          null,
          null,
          null,
        ],
      }
    `);

    expect(config.getSelection('test:magic.md', PRIMARY_EDITOR_INDEX)).toEqual({
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
      PRIMARY_EDITOR_INDEX,
    );

    expect(config.getSelection('test:magic.md', PRIMARY_EDITOR_INDEX)).toEqual({
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
    config = config.updateSelection(
      undefined,
      'test:magic.md',
      PRIMARY_EDITOR_INDEX,
    );

    expect(
      config.getSelection('test:magic.md', PRIMARY_EDITOR_INDEX),
    ).toBeUndefined();
  });

  test('updateSelection with invalid editorId keeps the same', () => {
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
      313,
    );

    expect(newConfig).toEqual(config);
  });

  test('updateScrollPosition with incorrect editorId keeps the same', () => {
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

    const newConfig = config.updateScrollPosition(3, 'test:wonder.md', -1);

    expect(newConfig).toEqual(config);
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

    expect(oldConfig.getSelection('test:wonder.md', PRIMARY_EDITOR_INDEX)).toBe(
      undefined,
    );

    let config = oldConfig.updateSelection(
      {
        anchor: 24,
        head: 24,
        type: 'text',
      },
      'test:wonder.md',
      PRIMARY_EDITOR_INDEX,
    );

    expect(config).not.toBe(oldConfig);

    expect(config.getSelection('test:magic.md', PRIMARY_EDITOR_INDEX)).toEqual({
      anchor: 20,
      head: 20,
      type: 'text',
    });

    expect(config.getSelection('test:wonder.md', PRIMARY_EDITOR_INDEX)).toEqual(
      {
        anchor: 24,
        head: 24,
        type: 'text',
      },
    );
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
      PRIMARY_EDITOR_INDEX,
    );

    expect(config).toMatchInlineSnapshot(`
      OpenedEditorsConfig {
        "_scrollPositions": [
          null,
          null,
          null,
          null,
        ],
        "_selections": [
          {
            "test:wonder.md": {
              "anchor": 24,
              "head": 24,
              "type": "text",
            },
          },
          null,
          null,
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
    config = config.updateScrollPosition(
      undefined,
      'test:wonder.md',
      PRIMARY_EDITOR_INDEX,
    );
    expect(
      config.getScrollPosition('test:magic.md', PRIMARY_EDITOR_INDEX),
    ).toBeUndefined();
  });
});

describe('serializing', () => {
  test('with empty values', () => {
    let config = OpenedEditorsConfig.fromJsonObj({});
    expect(
      config.getScrollPosition('test:magic.md', PRIMARY_EDITOR_INDEX),
    ).toBeUndefined();
    expect(
      config.getSelection('test:magic.md', PRIMARY_EDITOR_INDEX),
    ).toBeUndefined();
    expect(config.toJsonObj()).toEqual({
      scrollPositions: createNullArray(MAX_OPEN_EDITORS),
      selections: createNullArray(MAX_OPEN_EDITORS),
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
      .updateScrollPosition(3, 'test:wonder.md', SECONDARY_EDITOR_INDEX)
      .updateSelection(
        {
          anchor: 24,
          head: 24,
          type: 'text',
        },
        'test:wonder.md',
        PRIMARY_EDITOR_INDEX,
      )
      .updateScrollPosition(5, 'test:wonder2.md', SECONDARY_EDITOR_INDEX)
      .updateScrollPosition(3, 'test:first.md', PRIMARY_EDITOR_INDEX);

    expect(config.toJsonObj()).toEqual({
      scrollPositions: [
        {
          'test:first.md': 3,
        },
        {
          'test:wonder.md': 3,
          'test:wonder2.md': 5,
        },
        null,
        null,
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
        null,
        null,
      ],
    });
  });
});
