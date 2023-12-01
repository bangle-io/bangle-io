import { EditorIndex } from '@bangle.io/constants';

import { OpenedWsPaths } from '../opened-ws-paths';

describe('OpenedWsPaths', () => {
  test('works', () => {
    let result = OpenedWsPaths.createFromArray(['test-a:a.md', 'test-b:b.md']);

    expect(result.primaryWsPath).toBe('test-a:a.md');
    expect(result.secondaryWsPath).toBe('test-b:b.md');
  });

  test('compare', () => {
    expect(
      OpenedWsPaths.createFromArray(['test-a:a.md', 'test-b:b.md']).equal(
        OpenedWsPaths.createFromArray(['test-a:a.md', 'test-b:b.md']),
      ),
    ).toBe(true);

    let result = OpenedWsPaths.createFromArray(['test-a:a.md', 'test-b:b.md']);
    expect(result.equal(result)).toBe(true);
  });

  test('getCount', () => {
    let result = OpenedWsPaths.createFromArray(['test-a:a.md', undefined]);
    expect(result.openCount).toBe(1);

    result = OpenedWsPaths.createFromArray([undefined, undefined]);
    expect(result.openCount).toBe(0);

    result = OpenedWsPaths.createFromArray(['test-a:a.md', 'text-n:n.md']);
    expect(result.openCount).toBe(2);
  });

  test('undefined undefined result same value', () => {
    let result = OpenedWsPaths.createFromArray(['test-a:a.md', undefined]);

    expect(
      result.equal(
        OpenedWsPaths.createFromArray(['test-a:a.md', undefined as any]),
      ),
    ).toBe(true);
    expect(
      OpenedWsPaths.createFromArray(['test-a:a.md', undefined as any]).equal(
        OpenedWsPaths.createFromArray(['test-a:a.md', undefined as any]),
      ),
    ).toBe(true);

    expect(
      OpenedWsPaths.createFromArray([undefined as any, undefined as any]).equal(
        OpenedWsPaths.createFromArray([undefined as any, undefined as any]),
      ),
    ).toBe(true);

    expect(
      OpenedWsPaths.createFromArray([undefined as any, undefined as any]).equal(
        OpenedWsPaths.createFromArray(['test-a:a.md', undefined as any]),
      ),
    ).toBe(false);
  });

  test('has', () => {
    let result = OpenedWsPaths.createFromArray(['test-a:a.md', undefined]);
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
    let result = OpenedWsPaths.createFromArray(['test-a:a.md', undefined]);
    expect(result.hasSomeOpenedWsPaths()).toBe(true);

    result = OpenedWsPaths.createFromArray(['test-a:a.md', 'test-a:a.md']);
    expect(result.hasSomeOpenedWsPaths()).toBe(true);

    result = OpenedWsPaths.createFromArray([undefined, undefined]);
    expect(result.hasSomeOpenedWsPaths()).toBe(false);
  });

  test('getByIndex', () => {
    let result = OpenedWsPaths.createFromArray(['test-a:a.md', undefined]);
    expect(result.getByIndex(EditorIndex.PRIMARY)).toBe('test-a:a.md');
    expect(result.getByIndex(EditorIndex.SECONDARY)).toBe(undefined);
  });

  test('forEach 1', () => {
    let result = OpenedWsPaths.createFromArray(['test-a:a.md', undefined]);
    let called: any = [];

    result.forEachWsPath((wsPath, i) => {
      called.push([wsPath, i]);
    });
    expect(called).toEqual([['test-a:a.md', 0]]);
  });

  test('forEach 2', () => {
    let result = OpenedWsPaths.createFromArray(['test-a:a.md', 'test-b:b.md']);
    let called: any = [];

    result.forEachWsPath((wsPath, i) => {
      called.push([wsPath, i]);
    });
    expect(called).toEqual([
      ['test-a:a.md', 0],
      ['test-b:b.md', 1],
    ]);
  });

  test('closeIfFound', () => {
    let result = OpenedWsPaths.createFromArray(['test-a:a.md', undefined]);
    expect(result.closeIfFound('test-b:b.md')).toBe(result);
    expect(result.closeIfFound('test-a:a.md')).not.toBe(result);

    expect(
      result
        .closeIfFound('test-a:a.md')
        .equal(OpenedWsPaths.createFromArray([undefined, undefined])),
    ).toBe(true);

    expect(
      OpenedWsPaths.createFromArray(['test-x:x.md', 'test-x:x.md'])
        .closeIfFound('test-x:x.md')
        .equal(OpenedWsPaths.createFromArray([undefined, undefined])),
    ).toBe(true);
  });

  test('updateIfFound', () => {
    let result = OpenedWsPaths.createFromArray(['test-a:a.md', undefined]);
    expect(result.updateIfFound('test-b:b.md', 'test-c:c.md')).toBe(result);
    expect(result.updateIfFound('test-a:a.md', 'test-c:c.md')).not.toBe(result);

    expect(
      result
        .updateIfFound('test-a:a.md', 'test-c:c.md')
        .equal(OpenedWsPaths.createFromArray(['test-c:c.md', undefined])),
    ).toBe(true);

    expect(
      OpenedWsPaths.createFromArray(['test-x:x.md', 'test-x:x.md'])
        .updateIfFound('test-x:x.md', 'test-c:c.md')
        .equal(OpenedWsPaths.createFromArray(['test-c:c.md', 'test-c:c.md'])),
    ).toBe(true);
  });

  test('close all', () => {
    let result = OpenedWsPaths.createFromArray([undefined, 'test-a:a.md']);

    expect(
      result
        .closeAll()
        .equal(OpenedWsPaths.createFromArray([undefined, undefined])),
    ).toBe(true);
  });

  test('updateByIndex', () => {
    let result = OpenedWsPaths.createFromArray([undefined, 'test-a:a.md']);

    expect(
      result
        .updateByIndex(0, 'test-b:b.md')
        .equal(OpenedWsPaths.createFromArray(['test-b:b.md', 'test-a:a.md'])),
    ).toBe(true);

    expect(
      result
        .updateByIndex(1, 'test-c:c.md')
        .equal(OpenedWsPaths.createFromArray([undefined, 'test-c:c.md'])),
    ).toBe(true);
  });

  describe('tryUpgradeSecondary', () => {
    test('works', () => {
      let result = OpenedWsPaths.createFromArray([undefined, 'test-a:a.md']);

      expect(
        result
          .tryUpgradeSecondary()
          .equal(OpenedWsPaths.createFromArray(['test-a:a.md', undefined])),
      ).toBe(true);

      result = OpenedWsPaths.createFromArray([undefined, undefined]);

      expect(
        result
          .tryUpgradeSecondary()
          .equal(OpenedWsPaths.createFromArray([undefined, undefined])),
      ).toBe(true);
    });

    test('only affects primary and secondary', () => {
      let result = OpenedWsPaths.createFromArray([
        undefined,
        'test-a:a.md',
        'test-b:b.md',
      ]);

      expect(
        result
          .tryUpgradeSecondary()
          .equal(
            OpenedWsPaths.createFromArray([
              'test-a:a.md',
              undefined,
              'test-b:b.md',
            ]),
          ),
      ).toBe(true);

      result = OpenedWsPaths.createFromArray([
        undefined,
        undefined,
        'test-b:b.md',
      ]);

      expect(
        result
          .tryUpgradeSecondary()
          .equal(
            OpenedWsPaths.createFromArray([
              undefined,
              undefined,
              'test-b:b.md',
            ]),
          ),
      ).toBe(true);
    });
  });
});
