import { OpenedWsPaths } from '../history';

describe('OpenedWsPaths', () => {
  test('works', () => {
    let result = new OpenedWsPaths(['a', 'b']);

    expect(result.primaryWsPath).toBe('a');
    expect(result.secondaryWsPath).toBe('b');
  });

  test('compare', () => {
    expect(
      new OpenedWsPaths(['a', 'b']).equal(new OpenedWsPaths(['a', 'b'])),
    ).toBe(true);

    let result = new OpenedWsPaths(['a', 'b']);
    expect(result.equal(result)).toBe(true);
  });

  test('getCount', () => {
    let result = new OpenedWsPaths(['a', undefined]);
    expect(result.openCount).toBe(1);

    result = new OpenedWsPaths([undefined, undefined]);
    expect(result.openCount).toBe(0);

    result = new OpenedWsPaths(['a', 'n']);
    expect(result.openCount).toBe(2);
  });

  test('undefined undefined result same value', () => {
    let result = new OpenedWsPaths(['a', undefined]);

    expect(result.equal(new OpenedWsPaths(['a', undefined as any]))).toBe(true);
    expect(
      new OpenedWsPaths(['a', undefined as any]).equal(
        new OpenedWsPaths(['a', undefined as any]),
      ),
    ).toBe(true);

    expect(
      new OpenedWsPaths([undefined as any, undefined as any]).equal(
        new OpenedWsPaths([undefined as any, undefined as any]),
      ),
    ).toBe(true);

    expect(
      new OpenedWsPaths([undefined as any, undefined as any]).equal(
        new OpenedWsPaths(['a', undefined as any]),
      ),
    ).toBe(false);
  });

  test('has', () => {
    let result = new OpenedWsPaths(['a', undefined]);
    expect(result.has(undefined)).toBe(false);
  });

  test('allBelongToSameWsName', () => {
    let result = new OpenedWsPaths(['hello:one.md', undefined]);
    expect(result.allBelongToSameWsName('hello')).toBe(true);

    result = new OpenedWsPaths(['hello:one.md', undefined]);
    expect(result.allBelongToSameWsName()).toBe(true);

    result = new OpenedWsPaths(['hello:one.md', 'bye:one.md']);
    expect(result.allBelongToSameWsName()).toBe(false);

    result = new OpenedWsPaths(['hello:one.md', 'bye:one.md']);
    expect(result.allBelongToSameWsName('bye')).toBe(false);

    result = new OpenedWsPaths(['hello:one.md', 'hello:one.md']);
    expect(result.allBelongToSameWsName('bye')).toBe(false);

    result = new OpenedWsPaths(['hello:one.md', 'hello:one.md']);
    expect(result.allBelongToSameWsName('hello')).toBe(true);

    result = OpenedWsPaths.createEmpty();
    expect(result.allBelongToSameWsName('bye')).toBe(true);
  });

  test('getWsNames', () => {
    let result = new OpenedWsPaths(['hello:one.md', undefined]);
    expect(result.getWsNames()).toEqual(['hello']);

    result = new OpenedWsPaths(['hello:one.md', 'hello:two/two.md']);
    expect(result.getWsNames()).toEqual(['hello']);

    result = new OpenedWsPaths(['hello:one.md', 'bye:two/two.md']);
    expect(result.getWsNames()).toEqual(['hello', 'bye']);
  });

  test('createFromArray', () => {
    expect(OpenedWsPaths.createFromArray([])).toMatchInlineSnapshot(`
      OpenedWsPaths {
        "wsPaths": Array [
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
        ],
      }
    `);
  });

  test('hasSomeOpenedWsPaths', () => {
    let result = new OpenedWsPaths(['a', undefined]);
    expect(result.hasSomeOpenedWsPaths()).toBe(true);

    result = new OpenedWsPaths(['a', 'a']);
    expect(result.hasSomeOpenedWsPaths()).toBe(true);

    result = new OpenedWsPaths([undefined, undefined]);
    expect(result.hasSomeOpenedWsPaths()).toBe(false);
  });

  test('getByIndex', () => {
    let result = new OpenedWsPaths(['a', undefined]);
    expect(result.getByIndex(0)).toBe('a');
    expect(result.getByIndex(1)).toBe(undefined);
  });

  test('forEach 1', () => {
    let result = new OpenedWsPaths(['a', undefined]);
    let called: any = [];

    result.forEachWsPath((wsPath, i) => {
      called.push([wsPath, i]);
    });
    expect(called).toEqual([['a', 0]]);
  });

  test('forEach 2', () => {
    let result = new OpenedWsPaths(['a', 'b']);
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
    let result = new OpenedWsPaths(['a', undefined]);
    expect(result.closeIfFound('b')).toBe(result);
    expect(result.closeIfFound('a')).not.toBe(result);

    expect(
      result.closeIfFound('a').equal(new OpenedWsPaths([undefined, undefined])),
    ).toBe(true);

    expect(
      new OpenedWsPaths(['x', 'x'])
        .closeIfFound('x')
        .equal(new OpenedWsPaths([undefined, undefined])),
    ).toBe(true);
  });

  test('updateIfFound', () => {
    let result = new OpenedWsPaths(['a', undefined]);
    expect(result.updateIfFound('b', 'c')).toBe(result);
    expect(result.updateIfFound('a', 'c')).not.toBe(result);

    expect(
      result.updateIfFound('a', 'c').equal(new OpenedWsPaths(['c', undefined])),
    ).toBe(true);

    expect(
      new OpenedWsPaths(['x', 'x'])
        .updateIfFound('x', 'c')
        .equal(new OpenedWsPaths(['c', 'c'])),
    ).toBe(true);
  });

  test('shrink', () => {
    let result = new OpenedWsPaths([undefined, 'a']);

    expect(result.shrink().equal(new OpenedWsPaths(['a', undefined]))).toBe(
      true,
    );

    result = new OpenedWsPaths([undefined, undefined]);

    expect(
      result.shrink().equal(new OpenedWsPaths([undefined, undefined])),
    ).toBe(true);
  });

  test('close all', () => {
    let result = new OpenedWsPaths([undefined, 'a']);

    expect(
      result.closeAll().equal(new OpenedWsPaths([undefined, undefined])),
    ).toBe(true);
  });

  test('updateByIndex', () => {
    let result = new OpenedWsPaths([undefined, 'a']);

    expect(
      result.updateByIndex(0, 'b').equal(new OpenedWsPaths(['b', 'a'])),
    ).toBe(true);

    expect(
      result.updateByIndex(1, 'c').equal(new OpenedWsPaths([undefined, 'c'])),
    ).toBe(true);
  });
});
