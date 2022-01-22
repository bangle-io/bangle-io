import crossFetch from 'cross-fetch';

import { GithubReadFileSystem } from '../github-read-fs';

global.fetch = crossFetch;
global.Response = crossFetch.Response;
global.Headers = crossFetch.Headers;
global.Request = crossFetch.Request;

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

test('writeFile', async () => {
  const fs = new GithubReadFileSystem({
    githubToken: undefined,
    githubOwner: undefined,
    githubRepo: undefined,
    githubBranch: undefined,
    allowedFile: undefined,
  });
  await fs.writeFile('hola/hi', toFile('my-data'));
  expect(await fs.readFile('hola/hi')).toMatchInlineSnapshot(`
    File {
      "filename": "foo.txt",
      "parts": Array [
        "my-data",
      ],
      "properties": Object {
        "type": "text/plain",
      },
    }
  `);
  expect(await fs.stat('hola/hi')).toEqual({
    mtimeMs: expect.any(Number),
  });
});

test('readFile from github', async () => {
  global.fetch = jest.fn(async () => {
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

  expect(global.fetch).toHaveBeenCalledTimes(1);
  expect(global.fetch).nthCalledWith(
    1,
    `https://raw.githubusercontent.com/${githubOwner}/${githubRepo}/${githubBranch}/hi`,
  );
  expect(data).toMatchInlineSnapshot(`"my-data"`);
});

test('readFile from github 404s', async () => {
  global.fetch = jest.fn(async () => {
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
  expect(global.fetch).toHaveBeenCalledTimes(1);
  expect(global.fetch).nthCalledWith(
    1,
    `https://raw.githubusercontent.com/${githubOwner}/${githubRepo}/${githubBranch}/hi`,
  );
});

test('readFile from github with non 404s', async () => {
  global.fetch = jest.fn(async () => {
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
  expect(global.fetch).toHaveBeenCalledTimes(1);
  expect(global.fetch).nthCalledWith(
    1,
    `https://raw.githubusercontent.com/${githubOwner}/${githubRepo}/${githubBranch}/hi`,
  );
  console.error = originalConsoleError;
});
test('doesnt readFile from github if one already exists', async () => {
  global.fetch = jest.fn(async () => {});
  const filePath = 'hola/hi';
  const fs = new GithubReadFileSystem({
    githubBranch,
    githubRepo,
    githubOwner,
  });

  await fs.writeFile('hola/hi', toFile('my-data'));

  const data = await fs.readFile(filePath);

  expect(global.fetch).toHaveBeenCalledTimes(0);
  expect(data).toMatchInlineSnapshot(`
    File {
      "filename": "foo.txt",
      "parts": Array [
        "my-data",
      ],
      "properties": Object {
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

  global.fetch = jest.fn(async () => {
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
  expect(global.fetch).toBeCalledTimes(1);
  expect(global.fetch).nthCalledWith(
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

  global.fetch = jest.fn(async (url) => {
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
  expect(global.fetch).toBeCalledTimes(2);
  expect(global.fetch).nthCalledWith(
    1,
    `https://raw.githubusercontent.com/fake-owner/fake-repo/master/.bangle/files.json`,
  );

  expect(global.fetch).nthCalledWith(
    2,
    'https://api.github.com/repos/fake-owner/fake-repo/git/trees/master?recursive=true',
    {
      headers: expect.any(Headers),
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

  global.fetch = jest.fn(async () => {
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
