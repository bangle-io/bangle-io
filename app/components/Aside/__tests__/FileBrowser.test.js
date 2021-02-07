import { flatPathsToTree } from '../FileBrowser';

describe('flatPathsToTree', () => {
  test('1 case', () => {
    const result = flatPathsToTree([
      'jojo/the/great/read.md',
      'jojo/the/phi.md',
    ]);

    expect(result).toEqual([
      {
        name: 'jojo',
        children: [
          {
            name: 'the',
            children: [
              {
                name: 'great',
                children: [
                  {
                    name: 'read.md',
                    path: 'jojo/the/great/read.md',
                  },
                ],
              },
              {
                name: 'phi.md',
                path: 'jojo/the/phi.md',
              },
            ],
          },
        ],
      },
    ]);
  });

  test('2 case', () => {
    const result = flatPathsToTree([
      'jojo/the/great/read.md',
      'jojo/the/great/read2.md',
    ]);

    expect(result).toEqual([
      {
        name: 'jojo',
        children: [
          {
            name: 'the',
            children: [
              {
                name: 'great',
                children: [
                  {
                    name: 'read.md',
                    path: 'jojo/the/great/read.md',
                  },
                  {
                    name: 'read2.md',
                    path: 'jojo/the/great/read2.md',
                  },
                ],
              },
            ],
          },
        ],
      },
    ]);
  });

  test('3 case', () => {
    const result = flatPathsToTree(['jojo/the/great/read.md', 'jojo/read2.md']);

    expect(result).toEqual([
      {
        name: 'jojo',
        children: [
          {
            name: 'the',
            children: [
              {
                name: 'great',
                children: [
                  {
                    name: 'read.md',
                    path: 'jojo/the/great/read.md',
                  },
                ],
              },
            ],
          },
          {
            name: 'read2.md',
            path: 'jojo/read2.md',
          },
        ],
      },
    ]);
  });

  test('4 case', () => {
    const result = flatPathsToTree(['read.md', 'read2.md']);

    expect(result).toEqual([
      {
        name: 'read.md',
        path: 'read.md',
      },
      {
        name: 'read2.md',
        path: 'read2.md',
      },
    ]);
  });
});
