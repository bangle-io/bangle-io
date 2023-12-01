import {
  convertPathToRegexp,
  getPrimaryWsPath,
  locationSetWsPath,
  pathMatcher,
  pathnameToWsName,
  pathnameToWsPath,
  searchToWsPath,
  wsNameToPathname,
  wsPathToPathname,
  wsPathToSearch,
} from '../location-helpers';
import { OpenedWsPaths } from '../opened-ws-paths';

describe('pathMatcher', () => {
  test('works with exact strings', () => {
    expect(pathMatcher('/ws/:wsName', '/ws/hello-world')).toEqual([
      true,
      {
        wsName: 'hello-world',
      },
    ]);
  });

  test('works with non-exact strings', () => {
    expect(
      pathMatcher('/ws/:wsName', '/ws/hello-world/my-thing/boo/hello-world.md'),
    ).toEqual([
      true,
      {
        wsName: 'hello-world',
      },
    ]);
  });
});

describe('wsPathToPathname & pathnameToWsPath', () => {
  test('wsPath and pathname 1', () => {
    expect(wsPathToPathname('test:one.md')).toEqual('/ws/test/one.md');
    expect(wsPathToPathname('test:one note.md')).toEqual(
      '/ws/test/one%20note.md',
    );
    expect(pathnameToWsPath(wsPathToPathname('test:one$note.md'))).toEqual(
      'test:one$note.md',
    );

    expect(pathnameToWsPath(wsPathToPathname('test:one%1note.md'))).toEqual(
      'test:one%1note.md',
    );

    expect(pathnameToWsPath(wsPathToPathname('test:one/%1note.md'))).toEqual(
      'test:one/%1note.md',
    );

    expect(pathnameToWsPath(wsPathToPathname('test:one/~note.md'))).toEqual(
      'test:one/~note.md',
    );
  });

  test('undefined for any other path', () => {
    expect(pathnameToWsPath('/hi/world')).toBeUndefined();
  });
  test('undefined pathname', () => {
    expect(pathnameToWsPath()).toBeUndefined();
  });

  test('providing a path with only wsName', () => {
    expect(pathnameToWsPath('/ws/world')).toBeUndefined();
    expect(pathnameToWsName('/ws/world')).toBe('world');
  });
});

describe('pathnameToWsName', () => {
  test('works 1', () => {
    expect(pathnameToWsName('/ws/mojo')).toEqual('mojo');
  });

  test('works 2', () => {
    expect(pathnameToWsName('/ws/mojo/magic')).toEqual('mojo');
  });

  test('works 3', () => {
    expect(pathnameToWsName('/ws/mojo /magic')).toEqual('mojo ');
  });

  test('works 4', () => {
    expect(pathnameToWsName('/ws/mojo ~/magic')).toEqual('mojo ~');
  });

  test('works 5', () => {
    expect(pathnameToWsName('/ws/mojo/magic/modo.md')).toEqual('mojo');
  });

  test('undefined', () => {
    expect(pathnameToWsPath(undefined)).toEqual(undefined);
  });
});

describe('wsNameToPathname', () => {
  test('works 1', () => {
    expect(wsNameToPathname('mojo')).toEqual('/ws/mojo');
  });

  test('works 2', () => {
    expect(pathnameToWsName(wsNameToPathname('magic#%12'))).toEqual(
      'magic#%12',
    );
  });

  test('works 3', () => {
    expect(pathnameToWsName(wsNameToPathname('magic#%12'))).toEqual(
      'magic#%12',
    );
  });
});

describe('searchToWsPath', () => {
  test('works', () => {
    expect(searchToWsPath(wsPathToSearch('test-ws:mojo.md', ''))).toEqual(
      'test-ws:mojo.md',
    );
  });

  test('overwrites exsting', () => {
    const existing = wsPathToSearch('test-ws:mojo.md', '');
    expect(
      searchToWsPath(wsPathToSearch('test-ws:mojo-new.md', existing)),
    ).toEqual('test-ws:mojo-new.md');
  });

  test('undefined search', () => {
    expect(searchToWsPath()).toBeUndefined();
  });

  test('not containing secondary in search', () => {
    const newSearch = new URLSearchParams('');
    newSearch.set('dan', 'hello-friend');
    expect(searchToWsPath(newSearch.toString())).toBeUndefined();
  });

  test('preserves any other search', () => {
    const newSearch = new URLSearchParams('');
    newSearch.set('dan', 'hello-friend');
    expect(newSearch.toString()).toMatchInlineSnapshot(`"dan=hello-friend"`);
    const res = wsPathToSearch('test-ws:mojo.md', newSearch.toString());
    expect(res).toMatchInlineSnapshot(
      `"dan=hello-friend&secondary=test-ws%253Amojo.md"`,
    );
    expect(searchToWsPath(res)).toEqual('test-ws:mojo.md');

    expect(searchToWsPath(wsPathToSearch('test-ws:mojo-new.md', res))).toEqual(
      'test-ws:mojo-new.md',
    );
  });
});

describe('locationSetWsPath', () => {
  test('works', () => {
    expect(
      locationSetWsPath(
        {
          pathname: '',
          search: '',
        },
        'hello',
        OpenedWsPaths.createEmpty(),
      ),
    ).toEqual({
      pathname: '/ws/hello',
      search: '',
    });
  });

  test('removes secondary', () => {
    const search = wsPathToSearch('hello:mojo.md', '');
    const pathname = wsNameToPathname('hello');
    const openedWsPaths = OpenedWsPaths.createEmpty();
    const res = locationSetWsPath(
      {
        pathname,
        search,
      },
      'hello',
      openedWsPaths,
    );

    expect(res).toEqual({
      pathname: '/ws/hello',
      search: '',
    });
  });

  test('updates secondary', () => {
    const search = wsPathToSearch('hello:mojo-old.md', '');
    const pathname = wsNameToPathname('hello');
    const openedWsPaths = OpenedWsPaths.createFromArray([
      undefined,
      'hello:mojo-2.md',
    ]);
    const res = locationSetWsPath(
      {
        pathname,
        search,
      },
      'hello',
      openedWsPaths,
    );

    expect(res).toEqual({
      pathname: '/ws/hello',
      search: wsPathToSearch('hello:mojo-2.md', ''),
    });
  });

  test('updates primary', () => {
    const search = '';
    const pathname = wsPathToPathname('hello:mojo-old.md');
    const openedWsPaths = OpenedWsPaths.createFromArray([
      'hello:mojo-new.md',
      undefined,
    ]);
    const res = locationSetWsPath(
      {
        pathname,
        search,
      },
      'hello',
      openedWsPaths,
    );

    expect(res).toEqual({
      pathname: wsPathToPathname('hello:mojo-new.md'),
      search: '',
    });
  });
});

describe('convertPathToRegexp', () => {
  test('converts simple path to regexp', () => {
    const { regexp } = convertPathToRegexp('/ws/:wsName');
    expect(regexp).toBeInstanceOf(RegExp);
    expect(regexp.test('/ws/hello')).toBeTruthy();
  });

  test('converts complex path to regexp', () => {
    const { regexp } = convertPathToRegexp('/ws/:wsName/:filePath');
    expect(regexp).toBeInstanceOf(RegExp);
    expect(regexp.test('/ws/hello/world')).toBeTruthy();
  });

  test('returns keys from path', () => {
    const { keys } = convertPathToRegexp('/ws/:wsName/:filePath');
    expect(keys).toHaveLength(2);
    expect(keys[0]).toHaveProperty('name', 'wsName');
    expect(keys[1]).toHaveProperty('name', 'filePath');
  });
});

describe('wsPathToPathname', () => {
  test('converts wsPath with special characters', () => {
    expect(wsPathToPathname('test:test/path@123.md')).toEqual(
      '/ws/test/test/path%40123.md',
    );
  });

  test('handles empty wsPath', () => {
    expect(() => wsPathToPathname('')).toThrow();
  });

  test('handles wsPath with no filePath', () => {
    expect(() => wsPathToPathname('test:')).toThrow();
  });
});

describe('pathnameToWsPath', () => {
  test('decodes encoded pathname', () => {
    expect(pathnameToWsPath('/ws/test/test%2Fpath%40123')).toEqual(
      'test:test/path@123',
    );
  });

  test('handles pathname with extra slashes', () => {
    expect(pathnameToWsPath('/ws/test/some/path/')).toEqual('test:some/path/');
  });
});

describe('wsNameToPathname', () => {
  test('encodes wsName with special characters', () => {
    expect(wsNameToPathname('hello world')).toEqual('/ws/hello%20world');
  });

  test('handles empty wsName', () => {
    expect(wsNameToPathname('')).toEqual('/ws/');
  });
});

describe('pathnameToWsName', () => {
  test('decodes encoded wsName', () => {
    expect(pathnameToWsName('/ws/hello%20world')).toEqual('hello world');
  });

  test('returns undefined for invalid pathname', () => {
    expect(pathnameToWsName('/invalid/path')).toBeUndefined();
  });
});

describe('wsPathToSearch', () => {
  test('encodes wsPath with special characters in search', () => {
    expect(searchToWsPath(wsPathToSearch('test:test/path@123', ''))).toEqual(
      'test:test/path@123',
    );
  });

  test('appends to existing search', () => {
    expect(
      searchToWsPath(wsPathToSearch('test:test/path', 'existing=param')),
    ).toEqual('test:test/path');
  });
});

describe('searchToWsPath', () => {
  test('decodes encoded wsPath from search', () => {
    expect(searchToWsPath('secondary=test%3Atest%2Fpath%40123')).toEqual(
      'test:test/path@123',
    );
  });

  test('handles search with multiple parameters', () => {
    expect(
      searchToWsPath('param1=value1&secondary=test%3Atest%2Fpath'),
    ).toEqual('test:test/path');
  });
});

describe('locationSetWsPath', () => {
  test('handles empty openedWsPaths', () => {
    const location = { pathname: '/ws/hello', search: 'param=value' };
    const wsName = 'hello';
    const openedWsPaths = OpenedWsPaths.createEmpty();
    expect(locationSetWsPath(location, wsName, openedWsPaths)).toEqual({
      pathname: '/ws/hello',
      search: 'param=value',
    });
  });

  test('updates location with both primary and secondary wsPaths', () => {
    const location = { pathname: '/ws/hello', search: 'param=value' };
    const wsName = 'hello';
    const openedWsPaths = OpenedWsPaths.createFromArray([
      'hello:primary.md',
      'hello:secondary.md',
    ]);
    expect(locationSetWsPath(location, wsName, openedWsPaths)).toEqual({
      pathname: '/ws/hello/primary.md',
      search: 'param=value&secondary=hello%253Asecondary.md',
    });
  });
});

describe('getPrimaryWsPath', () => {
  test('returns primary wsPath for valid pathname', () => {
    const location = { pathname: '/ws/hello/world.md', search: '' };
    expect(getPrimaryWsPath(location)).toEqual('hello:world.md');
  });

  test('returns primary wsPath for valid pathname', () => {
    const location = { pathname: '/ws/hello/world.xyz', search: '' };
    expect(getPrimaryWsPath(location)).toEqual(undefined);
  });
});
