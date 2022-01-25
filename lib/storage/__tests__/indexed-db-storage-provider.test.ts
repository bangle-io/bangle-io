/**
 * @jest-environment jsdom
 */
import { Node } from '@bangle.dev/pm';

import { createEditorFromMd, createPMNode } from '@bangle.io/test-utils';

import { StorageOpts } from '../base-storage';
import { IndexedDbStorageProvider } from '../indexed-db-storage-provider';

let idbProvider = new IndexedDbStorageProvider();

const editor = createEditorFromMd(`test doc`);

const opts: StorageOpts = {
  formatParser: jest.fn((value) => {
    return Node.fromJSON(editor.view.state.schema, value);
  }),
  formatSerializer: jest.fn((node: Node) => {
    return node.toJSON();
  }),
  specRegistry: {} as any,
  readWorkspaceMetadata: jest.fn(),
  updateWorkspaceMetadata: jest.fn(),
};

beforeEach(() => {
  idbProvider = new IndexedDbStorageProvider();
});

describe('fileExists', () => {
  test('file not found', async () => {
    await expect(idbProvider.fileExists('test:hello.md', opts)).resolves.toBe(
      false,
    );
  });
});

describe('listAllFiles', () => {
  test('empty', async () => {
    await expect(
      idbProvider.listAllFiles(new AbortController().signal, 'test', opts),
    ).resolves.toEqual([]);
  });
});

describe('saveFile / getFile', () => {
  test('file not found', async () => {
    await expect(
      idbProvider.getFile('hello:one.md', opts),
    ).rejects.toThrowErrorMatchingInlineSnapshot(
      `"BABY_FS_FILE_NOT_FOUND_ERROR:File hello/one.md not found"`,
    );
  });

  test('works', async () => {
    const file = new File(['hello I am a test file'], 'one.file');
    const wsPath = 'test:one.file';

    await idbProvider.saveFile(wsPath, file, opts);
    expect(await idbProvider.getFile(wsPath, opts)).toBe(file);

    expect(await idbProvider.fileExists(wsPath, opts)).toBe(true);

    await expect(
      idbProvider.listAllFiles(new AbortController().signal, 'test', opts),
    ).resolves.toEqual([wsPath]);
  });
});

describe('rename', () => {
  test('works', async () => {
    const file = new File(['hello I am a test file'], 'one.file');
    const wsPath = 'test:one.file';

    await idbProvider.saveFile(wsPath, file, opts);
    expect(await idbProvider.getFile(wsPath, opts)).toBe(file);

    await idbProvider.renameFile(wsPath, 'test:one-renamed.md', opts);

    expect(await idbProvider.getFile('test:one-renamed.md', opts)).toBe(file);
    expect(await idbProvider.fileExists('test:one.md', opts)).toBe(false);
  });
});

describe('fileStat', () => {
  test('works', async () => {
    const file = new File(['hello I am a test file'], 'one.file');
    const wsPath = 'test:one.file';

    await idbProvider.saveFile(wsPath, file, opts);

    expect(await idbProvider.fileStat(wsPath, opts)).toEqual({
      ctime: expect.any(Number),
      mtime: expect.any(Number),
    });
  });
});

describe('saveDoc / readDoc', () => {
  test('works', async () => {
    const wsPath = 'test:one.file';
    const editor = createEditorFromMd(`test doc`);

    const doc = editor.view.state.doc;

    const opts: StorageOpts = {
      formatParser: jest.fn((value) => {
        return Node.fromJSON(editor.view.state.schema, value);
      }),
      formatSerializer: jest.fn((node: Node) => {
        return node.toJSON();
      }),
      specRegistry: {} as any,
      readWorkspaceMetadata: jest.fn(),
      updateWorkspaceMetadata: jest.fn(),
    };

    await idbProvider.saveDoc(wsPath, doc, opts);

    expect((await idbProvider.getDoc(wsPath, opts)).toJSON()).toEqual(
      doc.toJSON(),
    );
  });

  test('works with other serializer', async () => {
    const wsPath = 'test:one.file';
    const editor = createEditorFromMd(`test doc`);

    const doc = editor.view.state.doc;

    const opts: StorageOpts = {
      formatParser: jest.fn((value) => {
        if (value === `I was serialized correctly`) {
          return createPMNode([], `I was parsed correctly`);
        }
        throw new Error('invalid');
      }),
      formatSerializer: jest.fn((node: Node) => {
        return `I was serialized correctly`;
      }),
      specRegistry: {} as any,
      readWorkspaceMetadata: jest.fn(),
      updateWorkspaceMetadata: jest.fn(),
    };

    await idbProvider.saveDoc(wsPath, doc, opts);

    expect((await idbProvider.getDoc(wsPath, opts)).toString()).toEqual(
      'doc(paragraph("I was parsed correctly"))',
    );
  });
});
