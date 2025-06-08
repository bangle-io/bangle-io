import { expect, test } from 'vitest';
import { buildTree, type TreeItem } from '../build-tree';

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
      id: 'test:a',
      name: 'a',
      isDir: true,
      wsPath: 'test:a',
      children: [
        {
          id: 'test:a/b',
          name: 'b',
          isDir: true,
          wsPath: 'test:a/b',
          children: [
            {
              id: 'test:a/b/c.md',
              name: 'c.md',
              isDir: false,
              wsPath: 'test:a/b/c.md',
            },
            {
              id: 'test:a/b/d.md',
              name: 'd.md',
              isDir: false,
              wsPath: 'test:a/b/d.md',
            },
          ],
        },
        {
          id: 'test:a/e.md',
          name: 'e.md',
          isDir: false,
          wsPath: 'test:a/e.md',
        },
      ],
    },
    {
      id: 'test:f',
      name: 'f',
      isDir: true,
      wsPath: 'test:f',
      children: [
        {
          id: 'test:f/g',
          name: 'g',
          isDir: true,
          wsPath: 'test:f/g',
          children: [
            {
              id: 'test:f/g/h.txt',
              name: 'h.txt',
              isDir: false,
              wsPath: 'test:f/g/h.txt',
            },
          ],
        },
      ],
    },
    {
      id: 'test:i',
      name: 'i',
      isDir: true,
      wsPath: 'test:i',
      children: [
        {
          id: 'test:i/j.txt',
          name: 'j.txt',
          isDir: false,
          wsPath: 'test:i/j.txt',
        },
      ],
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
      id: 'test:dir1',
      name: 'dir1',
      isDir: true,
      wsPath: 'test:dir1',
      children: [
        {
          id: 'test:dir1/dir2',
          name: 'dir2',
          isDir: true,
          wsPath: 'test:dir1/dir2',
          children: [
            {
              id: 'test:dir1/dir2/d.txt',
              name: 'd.txt',
              isDir: false,
              wsPath: 'test:dir1/dir2/d.txt',
            },
          ],
        },
        {
          id: 'test:dir1/c.txt',
          name: 'c.txt',
          isDir: false,
          wsPath: 'test:dir1/c.txt',
        },
      ],
    },
    { id: 'test:a.md', name: 'a.md', isDir: false, wsPath: 'test:a.md' },
    { id: 'test:b.txt', name: 'b.txt', isDir: false, wsPath: 'test:b.txt' },
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
      id: 'test:a',
      name: 'a',
      isDir: true,
      wsPath: 'test:a',
      children: [
        {
          id: 'test:a/b',
          name: 'b',
          isDir: true,
          wsPath: 'test:a/b',
          children: [
            {
              id: 'test:a/b/c.txt',
              name: 'c.txt',
              isDir: false,
              wsPath: 'test:a/b/c.txt',
            },
          ],
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
      id: 'test:a',
      name: 'a',
      isDir: true,
      wsPath: 'test:a',
      children: [
        {
          id: 'test:a/b',
          name: 'b',
          isDir: true,
          wsPath: 'test:a/b',
          children: [
            {
              id: 'test:a/b/c.md',
              name: 'c.md',
              isDir: false,
              wsPath: 'test:a/b/c.md',
            },
            {
              id: 'test:a/b/d.md',
              name: 'd.md',
              isDir: false,
              wsPath: 'test:a/b/d.md',
            },
          ],
        },
        {
          id: 'test:a/e.md',
          name: 'e.md',
          isDir: false,
          wsPath: 'test:a/e.md',
        },
      ],
    },
    {
      id: 'test:f',
      name: 'f',
      isDir: true,
      wsPath: 'test:f',
      children: [
        {
          id: 'test:f/g',
          name: 'g',
          isDir: true,
          wsPath: 'test:f/g',
          children: [
            {
              id: 'test:f/g/h.txt',
              name: 'h.txt',
              isDir: false,
              wsPath: 'test:f/g/h.txt',
            },
          ],
        },
      ],
    },
    {
      id: 'test:i',
      name: 'i',
      isDir: true,
      wsPath: 'test:i',
      children: [
        {
          id: 'test:i/j.txt',
          name: 'j.txt',
          isDir: false,
          wsPath: 'test:i/j.txt',
        },
      ],
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
    { id: 'test:b.txt', name: 'b.txt', isDir: false, wsPath: 'test:b.txt' },
    { id: 'test:a.md', name: 'a.md', isDir: false, wsPath: 'test:a.md' },
    {
      id: 'test:dir1',
      name: 'dir1',
      isDir: true,
      wsPath: 'test:dir1',
      children: [
        {
          id: 'test:dir1/c.txt',
          name: 'c.txt',
          isDir: false,
          wsPath: 'test:dir1/c.txt',
        },
        {
          id: 'test:dir1/dir2',
          name: 'dir2',
          isDir: true,
          wsPath: 'test:dir1/dir2',
          children: [
            {
              id: 'test:dir1/dir2/d.txt',
              name: 'd.txt',
              isDir: false,
              wsPath: 'test:dir1/dir2/d.txt',
            },
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
      id: 'test:a',
      name: 'a',
      isDir: true,
      wsPath: 'test:a',
      children: [
        {
          id: 'test:a/b',
          name: 'b',
          isDir: true,
          wsPath: 'test:a/b',
          children: [
            {
              id: 'test:a/b/c.txt',
              name: 'c.txt',
              isDir: false,
              wsPath: 'test:a/b/c.txt',
            },
          ],
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
      id: 'test:src',
      name: 'src',
      isDir: true,
      wsPath: 'test:src',
      children: [
        {
          id: 'test:src/components',
          name: 'components',
          isDir: true,
          wsPath: 'test:src/components',
          children: [
            {
              id: 'test:src/components/Button',
              name: 'Button',
              isDir: true,
              wsPath: 'test:src/components/Button',
              children: [
                {
                  id: 'test:src/components/Button/button.tsx',
                  name: 'button.tsx',
                  isDir: false,
                  wsPath: 'test:src/components/Button/button.tsx',
                },
              ],
            },
            {
              id: 'test:src/components/Input',
              name: 'Input',
              isDir: true,
              wsPath: 'test:src/components/Input',
              children: [
                {
                  id: 'test:src/components/Input/input.tsx',
                  name: 'input.tsx',
                  isDir: false,
                  wsPath: 'test:src/components/Input/input.tsx',
                },
              ],
            },
          ],
        },
        {
          id: 'test:src/utils',
          name: 'utils',
          isDir: true,
          wsPath: 'test:src/utils',
          children: [
            {
              id: 'test:src/utils/helpers.ts',
              name: 'helpers.ts',
              isDir: false,
              wsPath: 'test:src/utils/helpers.ts',
            },
          ],
        },
      ],
    },
    {
      id: 'test:README.md',
      name: 'README.md',
      isDir: false,
      wsPath: 'test:README.md',
    },
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
    { id: 'test:b.txt', name: 'b.txt', isDir: false, wsPath: 'test:b.txt' },
    { id: 'test:a.md', name: 'a.md', isDir: false, wsPath: 'test:a.md' },
    {
      id: 'test:dir1',
      name: 'dir1',
      isDir: true,
      wsPath: 'test:dir1',
      children: [
        {
          id: 'test:dir1/c.txt',
          name: 'c.txt',
          isDir: false,
          wsPath: 'test:dir1/c.txt',
        },
        {
          id: 'test:dir1/dir2',
          name: 'dir2',
          isDir: true,
          wsPath: 'test:dir1/dir2',
          children: [
            {
              id: 'test:dir1/dir2/d.txt',
              name: 'd.txt',
              isDir: false,
              wsPath: 'test:dir1/dir2/d.txt',
            },
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
      id: 'test:src',
      name: 'src',
      isDir: true,
      wsPath: 'test:src',
      isOpen: true,
      children: [
        {
          id: 'test:src/components',
          name: 'components',
          isDir: true,
          wsPath: 'test:src/components',
          isOpen: true,
          children: [
            {
              id: 'test:src/components/Button',
              name: 'Button',
              isDir: true,
              wsPath: 'test:src/components/Button',
              children: [
                {
                  id: 'test:src/components/Button/button.tsx',
                  name: 'button.tsx',
                  isDir: false,
                  wsPath: 'test:src/components/Button/button.tsx',
                },
              ],
            },
            {
              id: 'test:src/components/Input',
              name: 'Input',
              isDir: true,
              wsPath: 'test:src/components/Input',
              isOpen: true,
              children: [
                {
                  id: 'test:src/components/Input/input.tsx',
                  name: 'input.tsx',
                  isDir: false,
                  wsPath: 'test:src/components/Input/input.tsx',
                },
              ],
            },
          ],
        },
        {
          id: 'test:src/utils',
          name: 'utils',
          isDir: true,
          wsPath: 'test:src/utils',
          children: [
            {
              id: 'test:src/utils/helpers.ts',
              name: 'helpers.ts',
              isDir: false,
              wsPath: 'test:src/utils/helpers.ts',
            },
          ],
        },
      ],
    },
    {
      id: 'test:README.md',
      name: 'README.md',
      isDir: false,
      wsPath: 'test:README.md',
    },
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
      id: 'test:a',
      name: 'a',
      isDir: true,
      wsPath: 'test:a',
      isOpen: true,
      children: [
        {
          id: 'test:a/b',
          name: 'b',
          isDir: true,
          wsPath: 'test:a/b',
          isOpen: true,
          children: [
            {
              id: 'test:a/b/c.md',
              name: 'c.md',
              isDir: false,
              wsPath: 'test:a/b/c.md',
            },
            {
              id: 'test:a/b/d.md',
              name: 'd.md',
              isDir: false,
              wsPath: 'test:a/b/d.md',
            },
          ],
        },
        {
          id: 'test:a/e.md',
          name: 'e.md',
          isDir: false,
          wsPath: 'test:a/e.md',
        },
      ],
    },
    {
      id: 'test:f',
      name: 'f',
      isDir: true,
      wsPath: 'test:f',
      isOpen: true,
      children: [
        {
          id: 'test:f/g',
          name: 'g',
          isDir: true,
          wsPath: 'test:f/g',
          children: [
            {
              id: 'test:f/g/h.txt',
              name: 'h.txt',
              isDir: false,
              wsPath: 'test:f/g/h.txt',
            },
          ],
        },
      ],
    },
    {
      id: 'test:i',
      name: 'i',
      isDir: true,
      wsPath: 'test:i',
      children: [
        {
          id: 'test:i/j.txt',
          name: 'j.txt',
          isDir: false,
          wsPath: 'test:i/j.txt',
        },
      ],
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
      id: 'test:a',
      name: 'a',
      isDir: true,
      wsPath: 'test:a',
      children: [
        {
          id: 'test:a/b',
          name: 'b',
          isDir: true,
          wsPath: 'test:a/b',
          children: [
            {
              id: 'test:a/b/c.txt',
              name: 'c.txt',
              isDir: false,
              wsPath: 'test:a/b/c.txt',
            },
          ],
        },
        {
          id: 'test:a/d',
          name: 'd',
          isDir: true,
          wsPath: 'test:a/d',
          children: [
            {
              id: 'test:a/d/e.txt',
              name: 'e.txt',
              isDir: false,
              wsPath: 'test:a/d/e.txt',
            },
          ],
        },
      ],
    },
    {
      id: 'test:f',
      name: 'f',
      isDir: true,
      wsPath: 'test:f',
      children: [
        {
          id: 'test:f/g',
          name: 'g',
          isDir: true,
          wsPath: 'test:f/g',
          children: [
            {
              id: 'test:f/g/h.txt',
              name: 'h.txt',
              isDir: false,
              wsPath: 'test:f/g/h.txt',
            },
          ],
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
      id: 'test:a',
      name: 'a',
      isDir: true,
      wsPath: 'test:a',
      isOpen: true,
      children: [
        {
          id: 'test:a/b',
          name: 'b',
          isDir: true,
          wsPath: 'test:a/b',
          children: [
            {
              id: 'test:a/b/c.txt',
              name: 'c.txt',
              isDir: false,
              wsPath: 'test:a/b/c.txt',
            },
          ],
        },
        {
          id: 'test:a/d',
          name: 'd',
          isDir: true,
          wsPath: 'test:a/d',
          isOpen: true,
          children: [
            {
              id: 'test:a/d/e.txt',
              name: 'e.txt',
              isDir: false,
              wsPath: 'test:a/d/e.txt',
            },
          ],
        },
      ],
    },
    {
      id: 'test:f',
      name: 'f',
      isDir: true,
      wsPath: 'test:f',
      children: [
        {
          id: 'test:f/g',
          name: 'g',
          isDir: true,
          wsPath: 'test:f/g',
          children: [
            {
              id: 'test:f/g/h.txt',
              name: 'h.txt',
              isDir: false,
              wsPath: 'test:f/g/h.txt',
            },
          ],
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
      id: 'test:docs',
      name: 'docs',
      isDir: true,
      wsPath: 'test:docs',
      isOpen: true,
      children: [
        {
          id: 'test:docs/setup.md',
          name: 'setup.md',
          isDir: false,
          wsPath: 'test:docs/setup.md',
        },
      ],
    },
    {
      id: 'test:src',
      name: 'src',
      isDir: true,
      wsPath: 'test:src',
      isOpen: true,
      children: [
        {
          id: 'test:src/components',
          name: 'components',
          isDir: true,
          wsPath: 'test:src/components',
          isOpen: true,
          children: [
            {
              id: 'test:src/components/Button',
              name: 'Button',
              isDir: true,
              wsPath: 'test:src/components/Button',
              children: [
                {
                  id: 'test:src/components/Button/button.tsx',
                  name: 'button.tsx',
                  isDir: false,
                  wsPath: 'test:src/components/Button/button.tsx',
                },
              ],
            },
            {
              id: 'test:src/components/Input',
              name: 'Input',
              isDir: true,
              wsPath: 'test:src/components/Input',
              children: [
                {
                  id: 'test:src/components/Input/input.tsx',
                  name: 'input.tsx',
                  isDir: false,
                  wsPath: 'test:src/components/Input/input.tsx',
                },
              ],
            },
          ],
        },
        {
          id: 'test:src/utils',
          name: 'utils',
          isDir: true,
          wsPath: 'test:src/utils',
          children: [
            {
              id: 'test:src/utils/helpers.ts',
              name: 'helpers.ts',
              isDir: false,
              wsPath: 'test:src/utils/helpers.ts',
            },
          ],
        },
      ],
    },

    {
      id: 'test:README.md',
      name: 'README.md',
      isDir: false,
      wsPath: 'test:README.md',
    },
  ];

  const tree = buildTree(wsPaths, openPaths);
  expect(tree).toEqual(expectedTree);
});
