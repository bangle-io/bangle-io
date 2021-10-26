import { defaultSpecs } from '@bangle.dev/all-base-components';
import { Node } from '@bangle.dev/pm';

import { Extension, ExtensionRegistry } from '@bangle.io/extension-registry';
import mockBabyFs from '@bangle.io/test-utils/baby-fs-test-mock';

import { copyWorkspace, deleteFile, listAllFiles, saveDoc } from '../file-ops';

const originalFile = window.File;

const extensionRegistry = new ExtensionRegistry([
  Extension.create({
    name: 'core',
    application: {},
    editor: {
      specs: [...defaultSpecs()],
    },
  }),
]);

beforeEach(() => {
  (window as any).File = class File {
    constructor(public content, public fileName, public opts) {}
  };
});

afterEach(() => {
  window.File = originalFile;
});

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

describe('deleteFile', () => {
  test('works', async () => {
    await mockBabyFs.setupMockWorkspace({ name: 'kujo' });
    await mockBabyFs.setupMockFile('kujo', 'one.md');
    await mockBabyFs.setupMockFile('kujo', 'two.md');

    await deleteFile('kujo:one.md');

    expect(mockBabyFs.idbFS.unlink).toBeCalledTimes(1);
    expect(mockBabyFs.idbFS.unlink).toBeCalledWith('kujo/one.md');
  });
});
describe('saveDoc', () => {
  test('works', async () => {
    mockBabyFs.setupMockWorkspace({ name: 'kujo' });

    const doc = Node.fromJSON(extensionRegistry.specRegistry.schema, {
      type: 'doc',
      content: [
        {
          type: 'heading',
          attrs: {
            level: 1,
          },
          content: [
            {
              type: 'text',
              text: 'Hola',
            },
          ],
        },
        {
          type: 'paragraph',
          content: [
            {
              type: 'text',
              text: 'Hello world!',
            },
          ],
        },
      ],
    });
    await saveDoc('kujo:one.md', doc, extensionRegistry.specRegistry);

    expect(mockBabyFs.idbFS.writeFile).toBeCalledTimes(1);
    expect(mockBabyFs.idbFS.writeFile).toBeCalledWith(
      'kujo/one.md',
      new File(['# Hola\n\nHello world!'], 'one.md', { type: 'text/plain' }),
    );
  });
});
