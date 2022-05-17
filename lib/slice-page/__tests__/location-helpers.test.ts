import { OpenedWsPaths } from '@bangle.io/ws-path';

import {
  locationSetWsPath,
  pathMatcher,
  pathnameToWsName,
  pathnameToWsPath,
  searchToWsPath,
  wsNameToPathname,
  wsPathToPathname,
  wsPathToSearch,
} from '../location-helpers';

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
