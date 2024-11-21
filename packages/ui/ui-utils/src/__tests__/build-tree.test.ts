import { type TreeItem, buildTree } from '../build-tree';

test('buildTree with multiple files and directories', () => {
  const wsPaths = [
    'test:a/b/c.md',
    'test:a/b/d.md',
    'test:a/e.md',
    'test:f/g/h.txt',
    'test:i/j.txt',
  ];

  const expectedTree: TreeItem[] = [
    {
      name: 'a',
      isDir: true,
      children: [
        {
          name: 'b',
          isDir: true,
          children: [
            { name: 'c.md', isDir: false, wsPath: 'test:a/b/c.md' },
            { name: 'd.md', isDir: false, wsPath: 'test:a/b/d.md' },
          ],
        },
        { name: 'e.md', isDir: false, wsPath: 'test:a/e.md' },
      ],
    },
    {
      name: 'f',
      isDir: true,
      children: [
        {
          name: 'g',
          isDir: true,
          children: [{ name: 'h.txt', isDir: false, wsPath: 'test:f/g/h.txt' }],
        },
      ],
    },
    {
      name: 'i',
      isDir: true,
      children: [{ name: 'j.txt', isDir: false, wsPath: 'test:i/j.txt' }],
    },
  ];

  const tree = buildTree(wsPaths);

  expect(tree).toEqual(expectedTree);
});

test('buildTree with files at root level', () => {
  const wsPaths = [
    'test:a.md',
    'test:b.txt',
    'test:dir1/c.txt',
    'test:dir1/dir2/d.txt',
  ];

  const expectedTree: TreeItem[] = [
    {
      name: 'dir1',
      isDir: true,
      children: [
        {
          name: 'dir2',
          isDir: true,
          children: [
            { name: 'd.txt', isDir: false, wsPath: 'test:dir1/dir2/d.txt' },
          ],
        },
        { name: 'c.txt', isDir: false, wsPath: 'test:dir1/c.txt' },
      ],
    },
    { name: 'a.md', isDir: false, wsPath: 'test:a.md' },
    { name: 'b.txt', isDir: false, wsPath: 'test:b.txt' },
  ];

  const tree = buildTree(wsPaths);

  expect(tree).toEqual(expectedTree);
});

test('buildTree with empty wsPaths', () => {
  const wsPaths: string[] = [];

  const expectedTree: TreeItem[] = [];

  const tree = buildTree(wsPaths);

  expect(tree).toEqual(expectedTree);
});

test('buildTree with single file', () => {
  const wsPaths = ['test:a/b/c.txt'];

  const expectedTree: TreeItem[] = [
    {
      name: 'a',
      isDir: true,
      children: [
        {
          name: 'b',
          isDir: true,
          children: [{ name: 'c.txt', isDir: false, wsPath: 'test:a/b/c.txt' }],
        },
      ],
    },
  ];

  const tree = buildTree(wsPaths);

  expect(tree).toEqual(expectedTree);
});

test('buildTree with multiple files and directories', () => {
  const wsPaths = [
    'test:a/b/c.md',
    'test:a/b/d.md',
    'test:a/e.md',
    'test:f/g/h.txt',
    'test:i/j.txt',
  ];

  const expectedTree: TreeItem[] = [
    {
      name: 'a',
      isDir: true,
      children: [
        {
          name: 'b',
          isDir: true,
          children: [
            { name: 'c.md', isDir: false, wsPath: 'test:a/b/c.md' },
            { name: 'd.md', isDir: false, wsPath: 'test:a/b/d.md' },
          ],
        },
        { name: 'e.md', isDir: false, wsPath: 'test:a/e.md' },
      ],
    },
    {
      name: 'f',
      isDir: true,
      children: [
        {
          name: 'g',
          isDir: true,
          children: [{ name: 'h.txt', isDir: false, wsPath: 'test:f/g/h.txt' }],
        },
      ],
    },
    {
      name: 'i',
      isDir: true,
      children: [{ name: 'j.txt', isDir: false, wsPath: 'test:i/j.txt' }],
    },
  ];

  const tree = buildTree(wsPaths);

  expect(tree).toEqual(expectedTree);
});

test('buildTree with files at root level', () => {
  const wsPaths = [
    'test:a.md',
    'test:b.txt',
    'test:dir1/c.txt',
    'test:dir1/dir2/d.txt',
  ];

  const expectedTree: TreeItem[] = [
    { name: 'b.txt', isDir: false, wsPath: 'test:b.txt' },
    { name: 'a.md', isDir: false, wsPath: 'test:a.md' },
    {
      name: 'dir1',
      isDir: true,
      children: [
        { name: 'c.txt', isDir: false, wsPath: 'test:dir1/c.txt' },
        {
          name: 'dir2',
          isDir: true,
          children: [
            { name: 'd.txt', isDir: false, wsPath: 'test:dir1/dir2/d.txt' },
          ],
        },
      ],
    },
  ];

  const tree = buildTree(wsPaths, [], (optA, optB) => {
    // Files before directories, then reverse alphabetical order
    if (optA.isDir !== optB.isDir) {
      return optA.isDir ? 1 : -1; // Files come before directories
    }
    return optB.name.localeCompare(optA.name);
  });

  expect(tree).toEqual(expectedTree);
});

test('buildTree with empty wsPaths', () => {
  const wsPaths: string[] = [];

  const expectedTree: TreeItem[] = [];

  const tree = buildTree(wsPaths);

  expect(tree).toEqual(expectedTree);
});

test('buildTree with single file', () => {
  const wsPaths = ['test:a/b/c.txt'];

  const expectedTree: TreeItem[] = [
    {
      name: 'a',
      isDir: true,
      children: [
        {
          name: 'b',
          isDir: true,
          children: [{ name: 'c.txt', isDir: false, wsPath: 'test:a/b/c.txt' }],
        },
      ],
    },
  ];

  const tree = buildTree(wsPaths);

  expect(tree).toEqual(expectedTree);
});

test('buildTree with complex nested directories', () => {
  const wsPaths = [
    'test:src/components/Button/button.tsx',
    'test:src/components/Input/input.tsx',
    'test:src/utils/helpers.ts',
    'test:README.md',
  ];

  const expectedTree: TreeItem[] = [
    {
      name: 'src',
      isDir: true,
      children: [
        {
          name: 'components',
          isDir: true,
          children: [
            {
              name: 'Button',
              isDir: true,
              children: [
                {
                  name: 'button.tsx',
                  isDir: false,
                  wsPath: 'test:src/components/Button/button.tsx',
                },
              ],
            },
            {
              name: 'Input',
              isDir: true,
              children: [
                {
                  name: 'input.tsx',
                  isDir: false,
                  wsPath: 'test:src/components/Input/input.tsx',
                },
              ],
            },
          ],
        },
        {
          name: 'utils',
          isDir: true,
          children: [
            {
              name: 'helpers.ts',
              isDir: false,
              wsPath: 'test:src/utils/helpers.ts',
            },
          ],
        },
      ],
    },
    { name: 'README.md', isDir: false, wsPath: 'test:README.md' },
  ];

  const tree = buildTree(wsPaths);

  expect(tree).toEqual(expectedTree);
});

test('buildTree with custom comparator', () => {
  const wsPaths = [
    'test:a.md',
    'test:b.txt',
    'test:dir1/c.txt',
    'test:dir1/dir2/d.txt',
  ];

  const expectedTree: TreeItem[] = [
    { name: 'b.txt', isDir: false, wsPath: 'test:b.txt' },
    { name: 'a.md', isDir: false, wsPath: 'test:a.md' },
    {
      name: 'dir1',
      isDir: true,
      children: [
        { name: 'c.txt', isDir: false, wsPath: 'test:dir1/c.txt' },
        {
          name: 'dir2',
          isDir: true,
          children: [
            { name: 'd.txt', isDir: false, wsPath: 'test:dir1/dir2/d.txt' },
          ],
        },
      ],
    },
  ];

  const tree = buildTree(wsPaths, [], (optA, optB) => {
    // Files before directories, then reverse alphabetical order
    if (optA.isDir !== optB.isDir) {
      return optA.isDir ? 1 : -1; // Files come before directories
    }
    return optB.name.localeCompare(optA.name);
  });

  expect(tree).toEqual(expectedTree);
});

test('active paths', () => {
  const wsPaths = [
    'test:src/components/Input/input.tsx',
    'test:src/components/Button/button.tsx',
    'test:src/utils/helpers.ts',
    'test:README.md',
  ];

  const expectedTree: TreeItem[] = [
    {
      name: 'src',
      isDir: true,
      isOpen: true,
      children: [
        {
          name: 'components',
          isDir: true,
          isOpen: true,
          children: [
            {
              name: 'Button',
              isDir: true,
              children: [
                {
                  name: 'button.tsx',
                  isDir: false,
                  wsPath: 'test:src/components/Button/button.tsx',
                },
              ],
            },
            {
              name: 'Input',
              isDir: true,
              isOpen: true,
              children: [
                {
                  name: 'input.tsx',
                  isDir: false,
                  wsPath: 'test:src/components/Input/input.tsx',
                },
              ],
            },
          ],
        },
        {
          name: 'utils',
          isDir: true,
          children: [
            {
              name: 'helpers.ts',
              isDir: false,
              wsPath: 'test:src/utils/helpers.ts',
            },
          ],
        },
      ],
    },
    { name: 'README.md', isDir: false, wsPath: 'test:README.md' },
  ];

  const tree = buildTree(wsPaths, ['test:src/components/Input/input.tsx']);

  expect(tree).toEqual(expectedTree);
});

test('buildTree with open paths', () => {
  const wsPaths = [
    'test:a/b/c.md',
    'test:a/b/d.md',
    'test:a/e.md',
    'test:f/g/h.txt',
    'test:i/j.txt',
  ];

  const openPaths = ['test:a/b', 'test:f'];

  const expectedTree: TreeItem[] = [
    {
      name: 'a',
      isDir: true,
      isOpen: true,
      children: [
        {
          name: 'b',
          isDir: true,
          isOpen: true,
          children: [
            { name: 'c.md', isDir: false, wsPath: 'test:a/b/c.md' },
            { name: 'd.md', isDir: false, wsPath: 'test:a/b/d.md' },
          ],
        },
        { name: 'e.md', isDir: false, wsPath: 'test:a/e.md' },
      ],
    },
    {
      name: 'f',
      isDir: true,
      isOpen: true,
      children: [
        {
          name: 'g',
          isDir: true,
          children: [{ name: 'h.txt', isDir: false, wsPath: 'test:f/g/h.txt' }],
        },
      ],
    },
    {
      name: 'i',
      isDir: true,
      children: [{ name: 'j.txt', isDir: false, wsPath: 'test:i/j.txt' }],
    },
  ];

  const tree = buildTree(wsPaths, openPaths);

  expect(tree).toEqual(expectedTree);
});

test('buildTree with open path that does not exist', () => {
  const wsPaths = ['test:a/b/c.txt', 'test:a/d/e.txt', 'test:f/g/h.txt'];

  const openPaths = ['test:x/y/z.txt'];

  const expectedTree: TreeItem[] = [
    {
      name: 'a',
      isDir: true,
      children: [
        {
          name: 'b',
          isDir: true,
          children: [{ name: 'c.txt', isDir: false, wsPath: 'test:a/b/c.txt' }],
        },
        {
          name: 'd',
          isDir: true,
          children: [{ name: 'e.txt', isDir: false, wsPath: 'test:a/d/e.txt' }],
        },
      ],
    },
    {
      name: 'f',
      isDir: true,
      children: [
        {
          name: 'g',
          isDir: true,
          children: [{ name: 'h.txt', isDir: false, wsPath: 'test:f/g/h.txt' }],
        },
      ],
    },
  ];

  const tree = buildTree(wsPaths, openPaths);

  expect(tree).toEqual(expectedTree);
});

test('buildTree with a single file open path', () => {
  const wsPaths = ['test:a/b/c.txt', 'test:a/d/e.txt', 'test:f/g/h.txt'];

  const openPaths = ['test:a/d/e.txt'];

  const expectedTree: TreeItem[] = [
    {
      name: 'a',
      isDir: true,
      isOpen: true,
      children: [
        {
          name: 'b',
          isDir: true,
          children: [{ name: 'c.txt', isDir: false, wsPath: 'test:a/b/c.txt' }],
        },
        {
          name: 'd',
          isDir: true,
          isOpen: true,
          children: [{ name: 'e.txt', isDir: false, wsPath: 'test:a/d/e.txt' }],
        },
      ],
    },
    {
      name: 'f',
      isDir: true,
      children: [
        {
          name: 'g',
          isDir: true,
          children: [{ name: 'h.txt', isDir: false, wsPath: 'test:f/g/h.txt' }],
        },
      ],
    },
  ];

  const tree = buildTree(wsPaths, openPaths);

  expect(tree).toEqual(expectedTree);
});

test('buildTree with mixed openPaths including files and directories', () => {
  const wsPaths = [
    'test:src/components/Button/button.tsx',
    'test:src/components/Input/input.tsx',
    'test:src/utils/helpers.ts',
    'test:README.md',
    'test:docs/setup.md',
  ];

  const openPaths = [
    'test:src/components',
    'test:README.md', // This is a file and should not be marked as open
    'test:docs',
  ];

  const expectedTree: TreeItem[] = [
    {
      name: 'docs',
      isDir: true,
      isOpen: true,
      children: [
        { name: 'setup.md', isDir: false, wsPath: 'test:docs/setup.md' },
      ],
    },
    {
      name: 'src',
      isDir: true,
      isOpen: true,
      children: [
        {
          name: 'components',
          isDir: true,
          isOpen: true,
          children: [
            {
              name: 'Button',
              isDir: true,
              children: [
                {
                  name: 'button.tsx',
                  isDir: false,
                  wsPath: 'test:src/components/Button/button.tsx',
                },
              ],
            },
            {
              name: 'Input',
              isDir: true,
              children: [
                {
                  name: 'input.tsx',
                  isDir: false,
                  wsPath: 'test:src/components/Input/input.tsx',
                },
              ],
            },
          ],
        },
        {
          name: 'utils',
          isDir: true,
          children: [
            {
              name: 'helpers.ts',
              isDir: false,
              wsPath: 'test:src/utils/helpers.ts',
            },
          ],
        },
      ],
    },

    { name: 'README.md', isDir: false, wsPath: 'test:README.md' },
  ];

  const tree = buildTree(wsPaths, openPaths);
  expect(tree).toEqual(expectedTree);
});
