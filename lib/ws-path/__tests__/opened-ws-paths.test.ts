import {
  PRIMARY_EDITOR_INDEX,
  SECONDARY_EDITOR_INDEX,
} from '@bangle.io/constants';

import { OpenedWsPaths } from '../opened-ws-paths';

describe('OpenedWsPaths', () => {
  test('works', () => {
    let result = OpenedWsPaths.createFromArray(['a', 'b']);

    expect(result.primaryWsPath).toBe('a');
    expect(result.secondaryWsPath).toBe('b');
  });

  test('compare', () => {
    expect(
      OpenedWsPaths.createFromArray(['a', 'b']).equal(
        OpenedWsPaths.createFromArray(['a', 'b']),
      ),
    ).toBe(true);

    let result = OpenedWsPaths.createFromArray(['a', 'b']);
    expect(result.equal(result)).toBe(true);
  });

  test('getCount', () => {
    let result = OpenedWsPaths.createFromArray(['a', undefined]);
    expect(result.openCount).toBe(1);

    result = OpenedWsPaths.createFromArray([undefined, undefined]);
    expect(result.openCount).toBe(0);

    result = OpenedWsPaths.createFromArray(['a', 'n']);
    expect(result.openCount).toBe(2);
  });

  test('undefined undefined result same value', () => {
    let result = OpenedWsPaths.createFromArray(['a', undefined]);

    expect(
      result.equal(OpenedWsPaths.createFromArray(['a', undefined as any])),
    ).toBe(true);
    expect(
      OpenedWsPaths.createFromArray(['a', undefined as any]).equal(
        OpenedWsPaths.createFromArray(['a', undefined as any]),
      ),
    ).toBe(true);

    expect(
      OpenedWsPaths.createFromArray([undefined as any, undefined as any]).equal(
        OpenedWsPaths.createFromArray([undefined as any, undefined as any]),
      ),
    ).toBe(true);

    expect(
      OpenedWsPaths.createFromArray([undefined as any, undefined as any]).equal(
        OpenedWsPaths.createFromArray(['a', undefined as any]),
      ),
    ).toBe(false);
  });

  test('has', () => {
    let result = OpenedWsPaths.createFromArray(['a', undefined]);
    expect(result.has(undefined)).toBe(false);
  });

  test('allBelongToSameWsName', () => {
    let result = OpenedWsPaths.createFromArray(['hello:one.md', undefined]);
    expect(result.allBelongToSameWsName('hello')).toBe(true);

    result = OpenedWsPaths.createFromArray(['hello:one.md', undefined]);
    expect(result.allBelongToSameWsName()).toBe(true);

    result = OpenedWsPaths.createFromArray(['hello:one.md', 'bye:one.md']);
    expect(result.allBelongToSameWsName()).toBe(false);

    result = OpenedWsPaths.createFromArray(['hello:one.md', 'bye:one.md']);
    expect(result.allBelongToSameWsName('bye')).toBe(false);

    result = OpenedWsPaths.createFromArray(['hello:one.md', 'hello:one.md']);
    expect(result.allBelongToSameWsName('bye')).toBe(false);

    result = OpenedWsPaths.createFromArray(['hello:one.md', 'hello:one.md']);
    expect(result.allBelongToSameWsName('hello')).toBe(true);

    result = OpenedWsPaths.createEmpty();
    expect(result.allBelongToSameWsName('bye')).toBe(true);
  });

  test('getWsNames', () => {
    let result = OpenedWsPaths.createFromArray(['hello:one.md', undefined]);
    expect(result.getWsNames()).toEqual(['hello']);

    result = OpenedWsPaths.createFromArray([
      'hello:one.md',
      'hello:two/two.md',
    ]);
    expect(result.getWsNames()).toEqual(['hello']);

    result = OpenedWsPaths.createFromArray(['hello:one.md', 'bye:two/two.md']);
    expect(result.getWsNames()).toEqual(['hello', 'bye']);
  });

  test('getWsPaths', () => {
    let result = OpenedWsPaths.createFromArray(['hello:one.md', undefined]);
    expect(result.getWsPaths()).toEqual(['hello:one.md']);

    result = OpenedWsPaths.createFromArray([
      'hello:one.md',
      'hello:two/two.md',
    ]);
    expect(result.getWsPaths()).toEqual(['hello:one.md', 'hello:two/two.md']);

    result = OpenedWsPaths.createFromArray([
      'hello:one.md',
      'bye:two/two.md',
      'hello:one.md',
    ]);
    expect(result.getWsPaths()).toEqual(['hello:one.md', 'bye:two/two.md']);
  });

  test('createFromArray', () => {
    expect(OpenedWsPaths.createFromArray([])).toMatchInlineSnapshot(`
      OpenedWsPaths {
        "_wsPaths": [
          undefined,
          undefined,
          undefined,
          undefined,
        ],
      }
    `);

    expect(OpenedWsPaths.createFromArray(['hello:one.md']))
      .toMatchInlineSnapshot(`
      OpenedWsPaths {
        "_wsPaths": [
          "hello:one.md",
          undefined,
          undefined,
          undefined,
        ],
      }
    `);
  });

  test('hasSomeOpenedWsPaths', () => {
    let result = OpenedWsPaths.createFromArray(['a', undefined]);
    expect(result.hasSomeOpenedWsPaths()).toBe(true);

    result = OpenedWsPaths.createFromArray(['a', 'a']);
    expect(result.hasSomeOpenedWsPaths()).toBe(true);

    result = OpenedWsPaths.createFromArray([undefined, undefined]);
    expect(result.hasSomeOpenedWsPaths()).toBe(false);
  });

  test('getByIndex', () => {
    let result = OpenedWsPaths.createFromArray(['a', undefined]);
    expect(result.getByIndex(PRIMARY_EDITOR_INDEX)).toBe('a');
    expect(result.getByIndex(SECONDARY_EDITOR_INDEX)).toBe(undefined);
  });

  test('forEach 1', () => {
    let result = OpenedWsPaths.createFromArray(['a', undefined]);
    let called: any = [];

    result.forEachWsPath((wsPath, i) => {
      called.push([wsPath, i]);
    });
    expect(called).toEqual([['a', 0]]);
  });

  test('forEach 2', () => {
    let result = OpenedWsPaths.createFromArray(['a', 'b']);
    let called: any = [];

    result.forEachWsPath((wsPath, i) => {
      called.push([wsPath, i]);
    });
    expect(called).toEqual([
      ['a', 0],
      ['b', 1],
    ]);
  });

  test('closeIfFound', () => {
    let result = OpenedWsPaths.createFromArray(['a', undefined]);
    expect(result.closeIfFound('b')).toBe(result);
    expect(result.closeIfFound('a')).not.toBe(result);

    expect(
      result
        .closeIfFound('a')
        .equal(OpenedWsPaths.createFromArray([undefined, undefined])),
    ).toBe(true);

    expect(
      OpenedWsPaths.createFromArray(['x', 'x'])
        .closeIfFound('x')
        .equal(OpenedWsPaths.createFromArray([undefined, undefined])),
    ).toBe(true);
  });

  test('updateIfFound', () => {
    let result = OpenedWsPaths.createFromArray(['a', undefined]);
    expect(result.updateIfFound('b', 'c')).toBe(result);
    expect(result.updateIfFound('a', 'c')).not.toBe(result);

    expect(
      result
        .updateIfFound('a', 'c')
        .equal(OpenedWsPaths.createFromArray(['c', undefined])),
    ).toBe(true);

    expect(
      OpenedWsPaths.createFromArray(['x', 'x'])
        .updateIfFound('x', 'c')
        .equal(OpenedWsPaths.createFromArray(['c', 'c'])),
    ).toBe(true);
  });

  test('close all', () => {
    let result = OpenedWsPaths.createFromArray([undefined, 'a']);

    expect(
      result
        .closeAll()
        .equal(OpenedWsPaths.createFromArray([undefined, undefined])),
    ).toBe(true);
  });

  test('updateByIndex', () => {
    let result = OpenedWsPaths.createFromArray([undefined, 'a']);

    expect(
      result
        .updateByIndex(0, 'b')
        .equal(OpenedWsPaths.createFromArray(['b', 'a'])),
    ).toBe(true);

    expect(
      result
        .updateByIndex(1, 'c')
        .equal(OpenedWsPaths.createFromArray([undefined, 'c'])),
    ).toBe(true);
  });

  describe('tryUpgradeSecondary', () => {
    test('works', () => {
      let result = OpenedWsPaths.createFromArray([undefined, 'a']);

      expect(
        result
          .tryUpgradeSecondary()
          .equal(OpenedWsPaths.createFromArray(['a', undefined])),
      ).toBe(true);

      result = OpenedWsPaths.createFromArray([undefined, undefined]);

      expect(
        result
          .tryUpgradeSecondary()
          .equal(OpenedWsPaths.createFromArray([undefined, undefined])),
      ).toBe(true);
    });

    test('only affects primary and secondary', () => {
      let result = OpenedWsPaths.createFromArray([undefined, 'a', 'b']);

      expect(
        result
          .tryUpgradeSecondary()
          .equal(OpenedWsPaths.createFromArray(['a', undefined, 'b'])),
      ).toBe(true);

      result = OpenedWsPaths.createFromArray([undefined, undefined, 'b']);

      expect(
        result
          .tryUpgradeSecondary()
          .equal(OpenedWsPaths.createFromArray([undefined, undefined, 'b'])),
      ).toBe(true);
    });
  });
});
