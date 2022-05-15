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

  test('createFromArray', () => {
    expect(OpenedWsPaths.createFromArray([])).toMatchInlineSnapshot(`
      OpenedWsPaths {
        "wsPaths": Array [
          undefined,
          undefined,
          undefined,
        ],
      }
    `);

    expect(OpenedWsPaths.createFromArray(['hello:one.md']))
      .toMatchInlineSnapshot(`
      OpenedWsPaths {
        "wsPaths": Array [
          "hello:one.md",
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
    expect(result.getByIndex(0)).toBe('a');
    expect(result.getByIndex(1)).toBe(undefined);
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

  test('shrink', () => {
    let result = OpenedWsPaths.createFromArray([undefined, 'a']);

    expect(
      result.shrink().equal(OpenedWsPaths.createFromArray(['a', undefined])),
    ).toBe(true);

    result = OpenedWsPaths.createFromArray([undefined, undefined]);

    expect(
      result
        .shrink()
        .equal(OpenedWsPaths.createFromArray([undefined, undefined])),
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
});
