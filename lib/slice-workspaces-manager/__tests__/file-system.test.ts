import { Node } from '@bangle.dev/pm';

import { createExtensionRegistry } from '@bangle.io/test-utils/extension-registry';
import * as idbHelpers from '@bangle.io/test-utils/indexedb-ws-helpers';

import {
  copyWorkspace,
  deleteFile,
  getDoc,
  listAllFiles,
  saveDoc,
} from '../file-system';

const extensionRegistry = createExtensionRegistry([], { editorCore: true });

describe('listAllFiles', () => {
  test('works', async () => {
    await idbHelpers.setupMockWorkspace({ name: 'kujo' });

    await idbHelpers.setupMockFile('kujo', 'one.md');
    await idbHelpers.setupMockFile('kujo', 'two.md');

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
    await idbHelpers.setupMockWorkspace({ name: 'kujo' });
    await idbHelpers.setupMockWorkspace({ name: 'kujo-clone' });
    await idbHelpers.setupMockFile('kujo', 'one.md');
    await idbHelpers.setupMockFile('kujo', 'two.md');

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
    await idbHelpers.setupMockWorkspace({ name: 'kujo' });
    await idbHelpers.setupMockFile('kujo', 'one.md');
    await idbHelpers.setupMockFile('kujo', 'two.md');

    expect(await listAllFiles('kujo')).toHaveLength(2);

    await deleteFile('kujo:one.md');

    expect(await listAllFiles('kujo')).toHaveLength(1);
    expect(await listAllFiles('kujo')).toEqual(['kujo:two.md']);
  });
});
describe('saveDoc', () => {
  test('works', async () => {
    await idbHelpers.setupMockWorkspace({ name: 'kujo' });

    let docJson = {
      type: 'doc',
      content: [
        {
          type: 'heading',
          attrs: {
            collapseContent: null,

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
    };
    const doc = Node.fromJSON(extensionRegistry.specRegistry.schema, docJson);
    await saveDoc('kujo:one.md', doc, extensionRegistry.specRegistry);

    expect(
      (
        await getDoc('kujo:one.md', extensionRegistry.specRegistry, [])
      ).toJSON(),
    ).toEqual(docJson);

    // expect(idbFS.writeFile).toBeCalledTimes(1);
    // expect(idbFS.writeFile).toBeCalledWith(
    //   'kujo/one.md',
    //   new File(['# Hola\n\nHello world!'], 'one.md', { type: 'text/plain' }),
    // );
  });
});
