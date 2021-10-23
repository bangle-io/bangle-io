import { getPrimaryWsPath, getWsName, OpenedWsPaths } from '../history';

const createLocationObject = ({ pathname = '' }) => {
  return {
    hash: '',
    pathname: pathname,
    search: '',
    key: '',
    state: '',
  };
};

test('getPrimaryWsPath, works 1', () => {
  const result = getPrimaryWsPath(
    createLocationObject({ pathname: '/ws/mojo/blah' }),
  );
  expect(result).toBe('mojo:blah');
});

test('getPrimaryWsPath, works 2', () => {
  const result = getPrimaryWsPath(
    createLocationObject({ pathname: '/ws/mojo' }),
  );
  expect(result).toBe(undefined);
});

test('getWsName, works 1', () => {
  const result = getWsName(createLocationObject({ pathname: '/ws/mojo' }));
  expect(result).toBe('mojo');
});

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

  test('null undefined result same value', () => {
    let result = new OpenedWsPaths(['a', null]);

    expect(result.equal(new OpenedWsPaths(['a', undefined as any]))).toBe(true);
    expect(
      new OpenedWsPaths(['a', undefined as any]).equal(
        new OpenedWsPaths(['a', null as any]),
      ),
    ).toBe(true);

    expect(
      new OpenedWsPaths([undefined as any, undefined as any]).equal(
        new OpenedWsPaths([null as any, null as any]),
      ),
    ).toBe(true);

    expect(
      new OpenedWsPaths([undefined as any, undefined as any]).equal(
        new OpenedWsPaths(['a', null as any]),
      ),
    ).toBe(false);
  });

  test('has', () => {
    let result = new OpenedWsPaths(['a', null]);
    expect(result.has(null)).toBe(false);
  });

  test('forEach 1', () => {
    let result = new OpenedWsPaths(['a', null]);
    let called: [string, number][] = [];

    result.forEachWsPath((wsPath, i) => {
      called.push([wsPath, i]);
    });
    expect(called).toEqual([['a', 0]]);
  });

  test('forEach 2', () => {
    let result = new OpenedWsPaths(['a', 'b']);
    let called: [string, number][] = [];

    result.forEachWsPath((wsPath, i) => {
      called.push([wsPath, i]);
    });
    expect(called).toEqual([
      ['a', 0],
      ['b', 1],
    ]);
  });

  test('removeIfFound', () => {
    let result = new OpenedWsPaths(['a', null]);
    expect(result.removeIfFound('b')).toBe(result);
    expect(result.removeIfFound('a')).not.toBe(result);

    expect(
      result.removeIfFound('a').equal(new OpenedWsPaths([null, null])),
    ).toBe(true);

    expect(
      new OpenedWsPaths(['x', 'x'])
        .removeIfFound('x')
        .equal(new OpenedWsPaths([null, null])),
    ).toBe(true);
  });

  test('updateIfFound', () => {
    let result = new OpenedWsPaths(['a', null]);
    expect(result.updateIfFound('b', 'c')).toBe(result);
    expect(result.updateIfFound('a', 'c')).not.toBe(result);

    expect(
      result.updateIfFound('a', 'c').equal(new OpenedWsPaths(['c', null])),
    ).toBe(true);

    expect(
      new OpenedWsPaths(['x', 'x'])
        .updateIfFound('x', 'c')
        .equal(new OpenedWsPaths(['c', 'c'])),
    ).toBe(true);
  });
});
