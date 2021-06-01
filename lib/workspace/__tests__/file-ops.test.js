import mockBabyFs from './baby-fs.mock';
import { copyWorkspace, listAllFiles } from '../file-ops';

describe('listAllFiles', () => {
  test('works', async () => {
    mockBabyFs.setupMockWorkspace({ name: 'kujo' });
    await mockBabyFs.setupMockFile('kujo', 'one.md');
    await mockBabyFs.setupMockFile('kujo', 'two.md');

    await expect(listAllFiles('kujo')).resolves.toMatchInlineSnapshot(`
            Array [
              "kujo:one.md",
              "kujo:two.md",
            ]
          `);
    expect(5).toEqual(5);
  });
});

describe('copyWorkspace', () => {
  test('works', async () => {
    mockBabyFs.setupMockWorkspace({ name: 'kujo' });
    mockBabyFs.setupMockWorkspace({ name: 'kujo-clone' });
    await mockBabyFs.setupMockFile('kujo', 'one.md');
    await mockBabyFs.setupMockFile('kujo', 'two.md');

    expect(await listAllFiles('kujo')).toHaveLength(2);
    expect(await listAllFiles('kujo-clone')).toHaveLength(0);

    await copyWorkspace('kujo', 'kujo-clone');

    expect(await listAllFiles('kujo')).toHaveLength(2);
    expect(await listAllFiles('kujo-clone')).toHaveLength(2);
    await expect(listAllFiles('kujo-clone')).resolves.toMatchInlineSnapshot(`
            Array [
              "kujo-clone:one.md",
              "kujo-clone:two.md",
            ]
          `);
  });
});
