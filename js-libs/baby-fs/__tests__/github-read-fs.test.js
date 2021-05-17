import { GithubReadFileSystem } from '../github-read-fs';

let mockStore = new Map();
let mockMetaStore = new Map();

const getLast = (array) => array[array.length - 1];

const githubBranch = 'master';
const githubRepo = 'fake-repo';
const githubOwner = 'fake-owner';
const toFile = (str) => {
  var file = new File([str], 'foo.txt', { type: 'text/plain' });
  return file;
};

jest.mock('idb-keyval', () => {
  const idb = {};
  const dbSuffix = 3;

  idb.createStore = (dbName) => {
    return dbName;
  };

  const getStore = (args) => {
    if (getLast(args) === `baby-idb-meta-${dbSuffix}`) {
      return mockMetaStore;
    } else {
      return mockStore;
    }
  };

  idb.get = jest.fn(async (...args) => {
    return getStore(args).get(...args);
  });
  idb.del = jest.fn(async (...args) => {
    return getStore(args).delete(...args);
  });
  idb.set = jest.fn(async (...args) => {
    return getStore(args).set(...args);
  });
  idb.keys = jest.fn(async (...args) => {
    return Array.from(getStore(args).keys(...args));
  });
  return idb;
});
const originalFile = window.File;

beforeEach(() => {
  mockStore?.clear();
  mockMetaStore?.clear();
  window.fetch = undefined;
  window.File = class File {
    constructor(content, fileName, opts) {
      this.content = content;
      this.fileName = fileName;
      this.opts = opts;
    }
    async text() {
      return this.content;
    }
  };
});

afterEach(() => {
  window.File = originalFile;
});

test('writeFile', async () => {
  const fs = new GithubReadFileSystem({
    githubToken: undefined,
    githubOwner: undefined,
    githubRepo: undefined,
    githubBranch: undefined,
    allowedFile: undefined,
  });
  await fs.writeFile('hola/hi', toFile('my-data'));
  expect(mockStore).toMatchInlineSnapshot(`
    Map {
      "hola/hi" => File {
        "content": Array [
          "my-data",
        ],
        "fileName": "foo.txt",
        "opts": Object {
          "type": "text/plain",
        },
      },
    }
  `);
  expect(mockMetaStore.get('hola/hi')).toEqual({
    mtimeMs: expect.any(Number),
  });
});

test('readFile from github', async () => {
  window.fetch = jest.fn(async () => {
    return {
      ok: true,
      status: 200,
      blob: () => 'my-data',
    };
  });
  const filePath = 'hola/hi';

  const fs = new GithubReadFileSystem({
    githubBranch,
    githubRepo,
    githubOwner,
  });

  const data = await fs.readFile(filePath);

  expect(window.fetch).toHaveBeenCalledTimes(1);
  expect(window.fetch).nthCalledWith(
    1,
    `https://raw.githubusercontent.com/${githubOwner}/${githubRepo}/${githubBranch}/hi`,
  );
  expect(data).toMatchInlineSnapshot(`"my-data"`);
});

test('readFile from github 404s', async () => {
  window.fetch = jest.fn(async () => {
    return {
      ok: false,
      status: 404,
      blob: () => 'my-data',
    };
  });
  const filePath = 'hola/hi';

  const fs = new GithubReadFileSystem({
    githubBranch,
    githubRepo,
    githubOwner,
  });

  const data = fs.readFile(filePath);

  await expect(data).rejects.toMatchInlineSnapshot(
    `[GithubReadFileSystemError: BABY_FS_FILE_NOT_FOUND_ERROR:File hola/hi not found]`,
  );
  expect(window.fetch).toHaveBeenCalledTimes(1);
  expect(window.fetch).nthCalledWith(
    1,
    `https://raw.githubusercontent.com/${githubOwner}/${githubRepo}/${githubBranch}/hi`,
  );
});

test('readFile from github with non 404s', async () => {
  window.fetch = jest.fn(async () => {
    return {
      ok: false,
      status: 403,
      blob: () => 'my-data',
    };
  });
  const originalConsoleError = console.error;
  console.error = jest.fn();
  const filePath = 'hola/hi';

  const fs = new GithubReadFileSystem({
    githubBranch,
    githubRepo,
    githubOwner,
  });

  const data = fs.readFile(filePath);

  await expect(data).rejects.toMatchInlineSnapshot(
    `[GithubReadFileSystemError: BABY_FS_UPSTREAM_ERROR:Encountered an error making request to github]`,
  );
  expect(window.fetch).toHaveBeenCalledTimes(1);
  expect(window.fetch).nthCalledWith(
    1,
    `https://raw.githubusercontent.com/${githubOwner}/${githubRepo}/${githubBranch}/hi`,
  );
  console.error = originalConsoleError;
});
test('doesnt readFile from github if one already exists', async () => {
  window.fetch = jest.fn(async () => {});
  const filePath = 'hola/hi';
  const fs = new GithubReadFileSystem({
    githubBranch,
    githubRepo,
    githubOwner,
  });

  await fs.writeFile('hola/hi', toFile('my-data'));

  const data = await fs.readFile(filePath);

  expect(window.fetch).toHaveBeenCalledTimes(0);
  expect(data).toMatchInlineSnapshot(`
    File {
      "content": Array [
        "my-data",
      ],
      "fileName": "foo.txt",
      "opts": Object {
        "type": "text/plain",
      },
    }
  `);
});

test('opendirRecursive hits correct .bangle/files.json', async () => {
  const fs = new GithubReadFileSystem({
    githubBranch,
    githubRepo,
    githubOwner,
  });

  window.fetch = jest.fn(async () => {
    return {
      ok: true,
      json: () => ['other-file'],
    };
  });

  await fs.writeFile('hola/hi', toFile('my-data'));
  const data = await fs.opendirRecursive('/');

  expect(data).toMatchInlineSnapshot(`
    Array [
      "/other-file",
    ]
  `);
  expect(window.fetch).toBeCalledTimes(1);
  expect(window.fetch).nthCalledWith(
    1,
    `https://raw.githubusercontent.com/fake-owner/fake-repo/master/.bangle/files.json`,
  );
});

test('opendirRecursive hits github api if no .bangle/files.json', async () => {
  const fs = new GithubReadFileSystem({
    githubBranch,
    githubRepo,
    githubOwner,
  });

  window.fetch = jest.fn(async (url) => {
    if (url.endsWith('files.json')) {
      return {
        okay: false,
        status: 404,
      };
    }
    return {
      ok: true,
      json: () => ({
        truncated: false,
        tree: [{ path: 'some/path/in/tree' }],
      }),
    };
  });

  await fs.writeFile('hola/hi', toFile('my-data'));
  const data = await fs.opendirRecursive('/');

  expect(data).toMatchInlineSnapshot(`
    Array [
      "/some/path/in/tree",
    ]
  `);
  expect(window.fetch).toBeCalledTimes(2);
  expect(window.fetch).nthCalledWith(
    1,
    `https://raw.githubusercontent.com/fake-owner/fake-repo/master/.bangle/files.json`,
  );

  expect(window.fetch).nthCalledWith(
    2,
    'https://api.github.com/repos/fake-owner/fake-repo/git/trees/master?recursive=true',
    {
      headers: {
        accept: 'application/vnd.github.v3+json',
        authorization: undefined,
      },
      method: 'GET',
    },
  );
});

test('_allowedFile works', async () => {
  const fs = new GithubReadFileSystem({
    githubBranch,
    githubRepo,
    githubOwner,
    allowedFile: (file) => file.endsWith('.md'),
  });

  window.fetch = jest.fn(async () => {
    return {
      ok: true,
      json: () => ['other-file.md', 'good.exe'],
    };
  });

  const data = await fs.opendirRecursive('/');

  expect(data).toMatchInlineSnapshot(`
    Array [
      "/other-file.md",
    ]
  `);
});
