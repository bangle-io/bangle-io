/**
 * @vitest-environment happy-dom
 */
import { isAbortError } from '@bangle.io/mini-js-utils';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { isNativeFsError, NATIVE_FS_ERROR_CODE } from '../errors';
import { NativeFs } from '../native-fs';
import {
  asRootHandle,
  FakeDirectoryHandle,
  FakeFileHandle,
  FakeLockManager,
  getEntry,
  seedTree,
} from './fakes';

function setup(files: Record<string, string> = {}) {
  const root = new FakeDirectoryHandle('my-notes');
  const fs = new NativeFs({ rootHandle: asRootHandle(root) });
  const seeded = seedTree(root, files);
  return { root, fs, seeded };
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('read operations', () => {
  it('reads a file and its text content', async () => {
    const { fs, seeded } = setup({ 'a/b/note.md': '# hello' });
    await seeded;

    const file = await fs.readFile('a/b/note.md');
    expect(file.name).toBe('note.md');
    expect(await file.text()).toBe('# hello');
    expect(await fs.readFileText('a/b/note.md')).toBe('# hello');
  });

  it('throws typed notFound for a missing file', async () => {
    const { fs } = setup();
    const error = await fs.readFile('missing.md').catch((e) => e);
    expect(isNativeFsError(error, NATIVE_FS_ERROR_CODE.notFound)).toBe(true);
  });

  it('reports existence without conflating other failures', async () => {
    const { fs, root, seeded } = setup({ 'x.md': 'x' });
    await seeded;
    expect(await fs.exists('x.md')).toBe(true);
    expect(await fs.exists('y.md')).toBe(false);

    // A permission failure must not read as "file does not exist".
    root.permissions.read = 'prompt';
    const error = await fs.exists('x.md').catch((e) => e);
    expect(isNativeFsError(error, NATIVE_FS_ERROR_CODE.permissionDenied)).toBe(
      true,
    );
  });

  it('treats a directory at a file path as a type mismatch, not missing', async () => {
    const { fs, seeded } = setup({ 'docs/inner.md': 'x' });
    await seeded;
    const error = await fs.readFile('docs').catch((e) => e);
    expect(isNativeFsError(error, NATIVE_FS_ERROR_CODE.typeMismatch)).toBe(
      true,
    );
  });

  it('stats mtime and size', async () => {
    const { fs, seeded } = setup({ 'a.md': 'abcd' });
    await seeded;
    const stat = await fs.stat('a.md');
    expect(stat.sizeBytes).toBe(4);
    expect(stat.mtimeMs).toBeGreaterThan(0);
  });

  it('rejects invalid paths with a typed error', async () => {
    const { fs } = setup();
    for (const bad of ['', '/abs.md', 'a//b.md', '../up.md', 'a/./b.md']) {
      const error = await fs.readFile(bad).catch((e) => e);
      expect(
        isNativeFsError(error, NATIVE_FS_ERROR_CODE.invalidPath),
        `path: "${bad}"`,
      ).toBe(true);
    }
  });
});

describe('createFile and writeFile', () => {
  it('creates a file with intermediate directories', async () => {
    const { fs, root } = setup();
    await fs.createFile('deep/nested/new.md', new Blob(['fresh']));
    const entry = getEntry(root, 'deep/nested/new.md');
    expect(entry).toBeInstanceOf(FakeFileHandle);
    expect(await fs.readFileText('deep/nested/new.md')).toBe('fresh');
  });

  it('rejects creating an existing file with alreadyExists', async () => {
    const { fs, seeded } = setup({ 'a.md': 'original' });
    await seeded;
    const error = await fs
      .createFile('a.md', new Blob(['clobber']))
      .catch((e) => e);
    expect(isNativeFsError(error, NATIVE_FS_ERROR_CODE.alreadyExists)).toBe(
      true,
    );
    expect(await fs.readFileText('a.md')).toBe('original');
  });

  it('overwrites with writeFile and honors create: false', async () => {
    const { fs, seeded } = setup({ 'a.md': 'old' });
    await seeded;
    await fs.writeFile('a.md', new Blob(['new']));
    expect(await fs.readFileText('a.md')).toBe('new');

    const error = await fs
      .writeFile('missing.md', new Blob(['x']), { create: false })
      .catch((e) => e);
    expect(isNativeFsError(error, NATIVE_FS_ERROR_CODE.notFound)).toBe(true);

    await fs.writeFile('made.md', new Blob(['x']));
    expect(await fs.readFileText('made.md')).toBe('x');
  });

  it('requires readwrite permission for mutations', async () => {
    const { fs, root, seeded } = setup({ 'a.md': 'old' });
    await seeded;
    root.permissions.readwrite = 'prompt';
    const error = await fs.writeFile('a.md', new Blob(['x'])).catch((e) => e);
    expect(isNativeFsError(error, NATIVE_FS_ERROR_CODE.permissionDenied)).toBe(
      true,
    );
    expect(await fs.readFileText('a.md')).toBe('old');
  });

  it('requests an exclusive writable, falls back when unsupported, and remembers the answer', async () => {
    const { fs, root, seeded } = setup({ 'a.md': 'old' });
    await seeded;
    const handle = getEntry(root, 'a.md') as FakeFileHandle;

    await fs.writeFile('a.md', new Blob(['one']));
    expect(handle.sawWritableModes).toEqual(['exclusive']);

    handle.supportsWritableMode = false;
    await fs.writeFile('a.md', new Blob(['two']));
    expect(handle.sawWritableModes).toEqual([
      'exclusive',
      'exclusive', // rejected with TypeError...
      undefined, // ...then the fallback
    ]);
    expect(await fs.readFileText('a.md')).toBe('two');

    // Support is an engine property: after one TypeError the failed
    // exclusive attempt is not repeated on subsequent writes.
    await fs.writeFile('a.md', new Blob(['three']));
    expect(handle.sawWritableModes).toEqual([
      'exclusive',
      'exclusive',
      undefined,
      undefined,
    ]);
    expect(await fs.readFileText('a.md')).toBe('three');
  });

  it('does not latch the exclusive-unsupported memo on a non-TypeError failure', async () => {
    const { fs, root, seeded } = setup({ 'a.md': 'old' });
    await seeded;
    const handle = getEntry(root, 'a.md') as FakeFileHandle;

    // Hold an exclusive writable so the next exclusive attempt fails with a
    // NoModificationAllowedError DOMException — a real lock contention, not
    // the TypeError an engine without `mode` support throws.
    const held = await handle.createWritable({ mode: 'exclusive' });

    const error = await fs.writeFile('a.md', new Blob(['new'])).catch((e) => e);
    expect(error).toBeInstanceOf(Error);
    // A lock error must propagate, not silently retry in siloed mode (which
    // would defeat the lock): no `undefined`-mode attempt follows.
    expect(handle.sawWritableModes).toEqual(['exclusive', 'exclusive']);
    expect(await fs.readFileText('a.md')).toBe('old');

    // The memo stays unset: once the lock is released, the next write asks
    // for an exclusive writable again and succeeds.
    await held.abort();
    await fs.writeFile('a.md', new Blob(['new']));
    expect(handle.sawWritableModes).toEqual([
      'exclusive',
      'exclusive',
      'exclusive',
    ]);
    expect(await fs.readFileText('a.md')).toBe('new');
  });

  it('resolves an existing file once per overwrite (autosave hot path)', async () => {
    const { fs, root, seeded } = setup({ 'a.md': 'old' });
    await seeded;
    let fileHandleLookups = 0;
    const realGetFileHandle = root.getFileHandle.bind(root);
    root.getFileHandle = async (name, options) => {
      fileHandleLookups += 1;
      return realGetFileHandle(name, options);
    };

    await fs.writeFile('a.md', new Blob(['new']));
    // The probe doubles as the resolution — no second directory walk.
    expect(fileHandleLookups).toBe(1);
    expect(await fs.readFileText('a.md')).toBe('new');
  });

  it('aborts the writable on write failure so partial content is not committed', async () => {
    const { fs, root, seeded } = setup({ 'a.md': 'safe' });
    await seeded;
    const handle = getEntry(root, 'a.md') as FakeFileHandle;
    handle.writeFailure = new DOMException('disk full', 'QuotaExceededError');

    const error = await fs.writeFile('a.md', new Blob(['bad'])).catch((e) => e);
    expect(isNativeFsError(error, NATIVE_FS_ERROR_CODE.quotaExceeded)).toBe(
      true,
    );
    expect(await fs.readFileText('a.md')).toBe('safe');
  });
});

describe('failed writes roll back created entries', () => {
  it('a failed first create leaves no empty file and does not block retry', async () => {
    const { fs, root } = setup();
    // Rig the not-yet-existing file to fail its first write: pre-seeding the
    // failure requires the handle, so create it through the fake directly.
    const dir = root;
    const preFailing = new FakeFileHandle('new.md');
    preFailing.writeFailure = new DOMException(
      'disk full',
      'QuotaExceededError',
    );
    // Intercept creation: when NativeFs creates the handle, the fake returns
    // this pre-rigged one.
    const realGetFileHandle = dir.getFileHandle.bind(dir);
    dir.getFileHandle = async (name, options) => {
      if (name === 'new.md' && options?.create && !dir.entries.has(name)) {
        dir.entries.set(name, preFailing);
        return preFailing;
      }
      return realGetFileHandle(name, options);
    };

    const error = await fs
      .createFile('new.md', new Blob(['x']))
      .catch((e) => e);
    expect(isNativeFsError(error, NATIVE_FS_ERROR_CODE.quotaExceeded)).toBe(
      true,
    );
    // The empty entry was rolled back...
    expect(getEntry(root, 'new.md')).toBeUndefined();

    // ...so a retry succeeds instead of failing with alreadyExists.
    preFailing.writeFailure = undefined;
    await fs.createFile('new.md', new Blob(['retried']));
    expect(await fs.readFileText('new.md')).toBe('retried');
  });

  it('a failed writeFile on a new file leaves no empty file behind', async () => {
    const { fs, root } = setup();
    const preFailing = new FakeFileHandle('made.md');
    preFailing.writeFailure = new DOMException('boom', 'QuotaExceededError');
    const realGetFileHandle = root.getFileHandle.bind(root);
    root.getFileHandle = async (name, options) => {
      if (name === 'made.md' && options?.create && !root.entries.has(name)) {
        root.entries.set(name, preFailing);
        return preFailing;
      }
      return realGetFileHandle(name, options);
    };

    const error = await fs
      .writeFile('made.md', new Blob(['x']))
      .catch((e) => e);
    expect(isNativeFsError(error, NATIVE_FS_ERROR_CODE.quotaExceeded)).toBe(
      true,
    );
    expect(getEntry(root, 'made.md')).toBeUndefined();

    // An existing file that fails a write is NOT deleted.
    await fs.createFile('kept.md', new Blob(['original']));
    const kept = getEntry(root, 'kept.md') as FakeFileHandle;
    kept.writeFailure = new DOMException('boom', 'QuotaExceededError');
    await expect(fs.writeFile('kept.md', new Blob(['y']))).rejects.toThrow();
    expect(await fs.readFileText('kept.md')).toBe('original');
  });

  it('a failed fallback move rolls back the destination it created, keeping the source', async () => {
    const { fs, root, seeded } = setup({ 'a.md': 'precious' });
    await seeded;
    const preFailing = new FakeFileHandle('b.md');
    preFailing.writeFailure = new DOMException('boom', 'QuotaExceededError');
    const realGetFileHandle = root.getFileHandle.bind(root);
    root.getFileHandle = async (name, options) => {
      if (name === 'b.md' && options?.create && !root.entries.has(name)) {
        root.entries.set(name, preFailing);
        return preFailing;
      }
      return realGetFileHandle(name, options);
    };

    const error = await fs.moveFile('a.md', 'b.md').catch((e) => e);
    expect(isNativeFsError(error, NATIVE_FS_ERROR_CODE.quotaExceeded)).toBe(
      true,
    );
    expect(await fs.readFileText('a.md')).toBe('precious');
    // No empty destination lingers, so retrying the same move succeeds
    // (previously it would have failed with alreadyExists).
    expect(getEntry(root, 'b.md')).toBeUndefined();
    preFailing.writeFailure = undefined;
    await fs.moveFile('a.md', 'b.md');
    expect(await fs.readFileText('b.md')).toBe('precious');
    expect(getEntry(root, 'a.md')).toBeUndefined();
  });
});

describe('racing external writers (TOCTOU)', () => {
  /**
   * Simulates an external program creating `name` (with `content`) in the
   * window between the notFound probe and getFileHandle({create:true}) —
   * the create call then returns the external file instead of a fresh one.
   */
  function injectExternalFileOnCreate(
    root: FakeDirectoryHandle,
    name: string,
    content: string,
  ): FakeFileHandle {
    const external = new FakeFileHandle(name, content);
    const realGetFileHandle = root.getFileHandle.bind(root);
    root.getFileHandle = async (entryName, options) => {
      if (entryName === name && options?.create && !root.entries.has(name)) {
        root.entries.set(name, external);
        return external;
      }
      return realGetFileHandle(entryName, options);
    };
    return external;
  }

  it('createFile refuses to overwrite a file that appeared mid-create', async () => {
    const { fs, root } = setup();
    injectExternalFileOnCreate(root, 'raced.md', 'external bytes');

    const error = await fs
      .createFile('raced.md', new Blob(['ours']))
      .catch((e) => e);
    expect(isNativeFsError(error, NATIVE_FS_ERROR_CODE.alreadyExists)).toBe(
      true,
    );
    // The external file is intact — neither overwritten nor rolled back.
    expect(await fs.readFileText('raced.md')).toBe('external bytes');
  });

  it('a failed write never rolls back an entry holding external bytes', async () => {
    const { fs, root } = setup();
    const external = injectExternalFileOnCreate(root, 'raced.md', 'theirs');
    external.writeFailure = new DOMException('boom', 'QuotaExceededError');

    // writeFile(create:true) may legitimately overwrite, but when its write
    // fails the rollback must not delete a file it cannot prove it created.
    const error = await fs
      .writeFile('raced.md', new Blob(['ours']))
      .catch((e) => e);
    expect(isNativeFsError(error, NATIVE_FS_ERROR_CODE.quotaExceeded)).toBe(
      true,
    );
    expect(await fs.readFileText('raced.md')).toBe('theirs');
  });

  it('a fallback move refuses a destination that appeared mid-move', async () => {
    const { fs, root, seeded } = setup({ 'a.md': 'source' });
    await seeded;
    injectExternalFileOnCreate(root, 'b.md', 'external bytes');

    const error = await fs.moveFile('a.md', 'b.md').catch((e) => e);
    expect(isNativeFsError(error, NATIVE_FS_ERROR_CODE.alreadyExists)).toBe(
      true,
    );
    expect(await fs.readFileText('a.md')).toBe('source');
    expect(await fs.readFileText('b.md')).toBe('external bytes');
  });
});

describe('move failure modes', () => {
  it('rolls back the destination copy when deleting the source fails', async () => {
    const { fs, root, seeded } = setup({ 'a.md': 'precious' });
    await seeded;
    // OS lock / permission change at the final step of copy->verify->delete.
    const realRemoveEntry = root.removeEntry.bind(root);
    root.removeEntry = async (name: string) => {
      if (name === 'a.md') {
        throw new DOMException('locked', 'NoModificationAllowedError');
      }
      return realRemoveEntry(name);
    };

    const error = await fs.moveFile('a.md', 'b.md').catch((e) => e);
    expect(
      isNativeFsError(error, NATIVE_FS_ERROR_CODE.modificationNotAllowed),
    ).toBe(true);
    // No half-completed rename: the source survives and the destination copy
    // was rolled back, so a retry does not die with alreadyExists.
    expect(await fs.readFileText('a.md')).toBe('precious');
    expect(getEntry(root, 'b.md')).toBeUndefined();

    root.removeEntry = realRemoveEntry;
    await fs.moveFile('a.md', 'b.md');
    expect(await fs.readFileText('b.md')).toBe('precious');
    expect(getEntry(root, 'a.md')).toBeUndefined();
  });

  it('falls back to copy+delete when a present native move() rejects without effect', async () => {
    const { fs, root, seeded } = setup({ 'a.md': 'precious' });
    await seeded;
    const source = getEntry(root, 'a.md') as FakeFileHandle;
    source.move = async () => {
      throw new DOMException('move not supported here', 'NotSupportedError');
    };

    await fs.moveFile('a.md', 'b.md');
    expect(await fs.readFileText('b.md')).toBe('precious');
    expect(getEntry(root, 'a.md')).toBeUndefined();
  });

  it('does not fall back when a rejected native move left a destination behind', async () => {
    const { fs, root, seeded } = setup({ 'a.md': 'precious' });
    await seeded;
    const source = getEntry(root, 'a.md') as FakeFileHandle;
    source.move = async (destination, newName) => {
      // A move that failed midway: destination materialized, then rejected.
      destination.entries.set(
        newName ?? 'b.md',
        new FakeFileHandle(newName ?? 'b.md', 'half-moved'),
      );
      throw new DOMException('failed midway', 'InvalidStateError');
    };

    const error = await fs.moveFile('a.md', 'b.md').catch((e) => e);
    // The original error surfaces; copy+delete must NOT run on top of an
    // ambiguous half-effect.
    expect(isNativeFsError(error, NATIVE_FS_ERROR_CODE.unknown)).toBe(true);
    expect(await fs.readFileText('a.md')).toBe('precious');
  });

  it('preserves a destination changed after verification when source deletion fails', async () => {
    const { fs, root, seeded } = setup({ 'a.md': 'precious' });
    await seeded;
    const realRemoveEntry = root.removeEntry.bind(root);
    root.removeEntry = async (name: string) => {
      if (name === 'a.md') {
        const destination = getEntry(root, 'b.md') as FakeFileHandle;
        const writable = await destination.createWritable();
        await writable.write(new Blob(['external replacement']));
        await writable.close();
        throw new DOMException('locked', 'NoModificationAllowedError');
      }
      return realRemoveEntry(name);
    };

    await expect(fs.moveFile('a.md', 'b.md')).rejects.toThrow();
    expect(await fs.readFileText('a.md')).toBe('precious');
    expect(await fs.readFileText('b.md')).toBe('external replacement');
  });
});

describe('deleteFile', () => {
  it('deletes an existing file', async () => {
    const { fs, root, seeded } = setup({ 'a/b.md': 'x' });
    await seeded;
    await fs.deleteFile('a/b.md');
    expect(getEntry(root, 'a/b.md')).toBeUndefined();
  });

  it('throws notFound for a missing file', async () => {
    const { fs } = setup();
    const error = await fs.deleteFile('nope.md').catch((e) => e);
    expect(isNativeFsError(error, NATIVE_FS_ERROR_CODE.notFound)).toBe(true);
  });
});

describe('moveFile', () => {
  it('moves via copy + verify + delete when native move is unavailable', async () => {
    const { fs, root, seeded } = setup({ 'a/old.md': 'content' });
    await seeded;
    await fs.moveFile('a/old.md', 'b/new.md');
    expect(getEntry(root, 'a/old.md')).toBeUndefined();
    expect(await fs.readFileText('b/new.md')).toBe('content');
  });

  it('uses the native move() when the handle provides it', async () => {
    const { fs, root, seeded } = setup({ 'a/old.md': 'content' });
    await seeded;
    const handle = getEntry(root, 'a/old.md') as FakeFileHandle;
    const nativeMove = vi.fn(
      async (destination: FakeDirectoryHandle, newName?: string) => {
        const parent = getEntry(root, 'a') as FakeDirectoryHandle;
        parent.entries.delete(handle.name);
        handle.name = newName ?? handle.name;
        destination.entries.set(handle.name, handle);
      },
    );
    handle.move = nativeMove;

    await fs.moveFile('a/old.md', 'b/new.md');
    expect(nativeMove).toHaveBeenCalledTimes(1);
    expect(getEntry(root, 'a/old.md')).toBeUndefined();
    expect(await fs.readFileText('b/new.md')).toBe('content');
  });

  it('rejects when the destination exists, preserving both files', async () => {
    // There is deliberately no overwrite escape hatch: an occupied
    // destination is never deleted, so no failure mode can lose it.
    const { fs, seeded } = setup({ 'a.md': 'source', 'b.md': 'target' });
    await seeded;
    const error = await fs.moveFile('a.md', 'b.md').catch((e) => e);
    expect(isNativeFsError(error, NATIVE_FS_ERROR_CODE.alreadyExists)).toBe(
      true,
    );
    expect(await fs.readFileText('a.md')).toBe('source');
    expect(await fs.readFileText('b.md')).toBe('target');
  });

  /**
   * Rigs the not-yet-existing destination so the handle the move creates is
   * pre-configured (write failure, corrupt read-back, ...).
   */
  function interceptDestinationCreate(
    root: FakeDirectoryHandle,
    name: string,
    rig: (handle: FakeFileHandle) => void,
  ) {
    const preRigged = new FakeFileHandle(name);
    rig(preRigged);
    const realGetFileHandle = root.getFileHandle.bind(root);
    root.getFileHandle = async (entryName, options) => {
      if (entryName === name && options?.create && !root.entries.has(name)) {
        root.entries.set(name, preRigged);
        return preRigged;
      }
      return realGetFileHandle(entryName, options);
    };
  }

  it('keeps the source and rolls back the destination when the write fails', async () => {
    const { fs, root, seeded } = setup({ 'a.md': 'precious' });
    await seeded;
    interceptDestinationCreate(root, 'b.md', (handle) => {
      handle.writeFailure = new DOMException(
        'boom',
        'NoModificationAllowedError',
      );
    });

    const error = await fs.moveFile('a.md', 'b.md').catch((e) => e);
    expect(
      isNativeFsError(error, NATIVE_FS_ERROR_CODE.modificationNotAllowed),
    ).toBe(true);
    expect(await fs.readFileText('a.md')).toBe('precious');
    expect(getEntry(root, 'b.md')).toBeUndefined();
  });

  it('keeps the source when the destination reads back corrupted, even at the same length', async () => {
    const { fs, root, seeded } = setup({ 'a.md': 'precious' });
    await seeded;
    // Rig the destination read-back to return byte-flipped (same length)
    // content: File.size alone would not catch it.
    interceptDestinationCreate(root, 'b.md', (handle) => {
      handle.corruptReadBack = true;
    });

    const error = await fs.moveFile('a.md', 'b.md').catch((e) => e);
    expect(
      isNativeFsError(error, NATIVE_FS_ERROR_CODE.moveVerificationFailed),
    ).toBe(true);
    expect(await fs.readFileText('a.md')).toBe('precious');
    expect(getEntry(root, 'b.md')).toBeUndefined();
  });

  it('rejects moving a file onto itself', async () => {
    const { fs, seeded } = setup({ 'a.md': 'x' });
    await seeded;
    const error = await fs.moveFile('a.md', 'a.md').catch((e) => e);
    expect(isNativeFsError(error, NATIVE_FS_ERROR_CODE.invalidPath)).toBe(true);
  });

  it('throws notFound when the source is missing', async () => {
    const { fs } = setup();
    const error = await fs.moveFile('no.md', 'yes.md').catch((e) => e);
    expect(isNativeFsError(error, NATIVE_FS_ERROR_CODE.notFound)).toBe(true);
  });
});

describe('listFiles and iterFiles', () => {
  const TREE = {
    'top.md': '1',
    'a/one.md': '2',
    'a/deep/two.md': '3',
    '.git/config': '4',
    'b/three.txt': '5',
  };

  it('lists all files recursively with root-relative paths', async () => {
    const { fs, seeded } = setup(TREE);
    await seeded;
    const files = await fs.listFiles();
    expect(files.sort()).toEqual([
      '.git/config',
      'a/deep/two.md',
      'a/one.md',
      'b/three.txt',
      'top.md',
    ]);
  });

  it('applies directory filters before descending', async () => {
    const { fs, root, seeded } = setup(TREE);
    await seeded;
    const gitDir = getEntry(root, '.git') as FakeDirectoryHandle;
    let visitedGit = false;
    gitDir.onEntryVisited = () => {
      visitedGit = true;
    };

    const files = await fs.listFiles({
      includeDirectory: (name) => !name.startsWith('.'),
      includeFile: (name) => name.endsWith('.md'),
    });
    expect(files.sort()).toEqual(['a/deep/two.md', 'a/one.md', 'top.md']);
    expect(visitedGit).toBe(false);
  });

  it('scopes listing to dirPath', async () => {
    const { fs, seeded } = setup(TREE);
    await seeded;
    const files = await fs.listFiles({ dirPath: 'a' });
    expect(files.sort()).toEqual(['a/deep/two.md', 'a/one.md']);
  });

  it('throws notFound for a missing dirPath', async () => {
    const { fs } = setup();
    const error = await fs.listFiles({ dirPath: 'ghost' }).catch((e) => e);
    expect(isNativeFsError(error, NATIVE_FS_ERROR_CODE.notFound)).toBe(true);
  });

  it('aborts mid-walk with the original abort error', async () => {
    const { fs, root, seeded } = setup(TREE);
    await seeded;
    const controller = new AbortController();
    let visits = 0;
    root.onEntryVisited = () => {
      visits += 1;
      if (visits === 2) {
        controller.abort();
      }
    };

    const error = await fs
      .listFiles({ signal: controller.signal })
      .catch((e) => e);
    expect(isAbortError(error)).toBe(true);
    expect(isNativeFsError(error)).toBe(false);
  });

  it('requires read permission', async () => {
    const { fs, root, seeded } = setup(TREE);
    await seeded;
    root.permissions.read = 'denied';
    const error = await fs.listFiles().catch((e) => e);
    expect(isNativeFsError(error, NATIVE_FS_ERROR_CODE.permissionDenied)).toBe(
      true,
    );
  });

  it('wraps iteration failures into typed errors', async () => {
    const { fs, root, seeded } = setup(TREE);
    await seeded;
    root.iterationFailure = new DOMException('gone', 'NotFoundError');
    const error = await fs.listFiles().catch((e) => e);
    expect(isNativeFsError(error, NATIVE_FS_ERROR_CODE.notFound)).toBe(true);
  });
});

describe('cross-tab locking', () => {
  it('serializes mutations per path through navigator.locks', async () => {
    const { root, seeded } = setup({ 'a.md': 'x' });
    await seeded;
    const locks = new FakeLockManager();
    vi.stubGlobal('navigator', { locks });
    const fs = new NativeFs({ rootHandle: asRootHandle(root) });

    await fs.writeFile('a.md', new Blob(['1']));
    await fs.deleteFile('a.md');
    expect(locks.grantedLog).toEqual([
      'native-fs:my-notes:a.md',
      'native-fs:my-notes:a.md',
    ]);
  });

  it('acquires move locks in sorted order to avoid deadlocks', async () => {
    const { root, seeded } = setup({ 'z.md': 'x' });
    await seeded;
    const locks = new FakeLockManager();
    vi.stubGlobal('navigator', { locks });
    const fs = new NativeFs({
      rootHandle: asRootHandle(root),
      lockScope: 'ws-1',
    });

    await fs.moveFile('z.md', 'a.md');
    expect(locks.grantedLog).toEqual([
      'native-fs:ws-1:a.md',
      'native-fs:ws-1:z.md',
    ]);
  });
});

describe('watch', () => {
  it('reports not armed when FileSystemObserver is unavailable', async () => {
    const { fs } = setup();
    const controller = new AbortController();
    const { armed } = await fs.watch(() => undefined, {
      signal: controller.signal,
    });
    expect(armed).toBe(false);
  });

  it('maps change records and disconnects on abort', async () => {
    const { fs } = setup();
    let capturedCallback:
      | ((records: unknown[], observer: unknown) => void)
      | undefined;
    const disconnect = vi.fn();
    const observe = vi.fn(async () => undefined);

    class FakeObserver {
      constructor(callback: (records: unknown[], observer: unknown) => void) {
        capturedCallback = callback;
      }
      observe = observe;
      disconnect = disconnect;
    }
    vi.stubGlobal('FileSystemObserver', FakeObserver);

    const controller = new AbortController();
    const batches: unknown[] = [];
    const { armed } = await fs.watch((changes) => batches.push(changes), {
      signal: controller.signal,
    });
    expect(armed).toBe(true);
    expect(observe).toHaveBeenCalledWith(fs.rootHandle, { recursive: true });

    capturedCallback?.(
      [
        { type: 'appeared', relativePathComponents: ['a', 'new.md'] },
        {
          type: 'moved',
          relativePathComponents: ['b.md'],
          relativePathMovedFrom: ['a.md'],
        },
        {
          type: 'modified',
          relativePathComponents: ['dir'],
          changedHandle: { kind: 'directory' },
        },
        { type: 'something-new', relativePathComponents: [] },
      ],
      undefined,
    );
    expect(batches).toEqual([
      [
        { type: 'appeared', path: 'a/new.md' },
        { type: 'moved', path: 'b.md', movedFromPath: 'a.md' },
        { type: 'modified', path: 'dir', kind: 'directory' },
        { type: 'unknown', path: '' },
      ],
    ]);

    controller.abort();
    expect(disconnect).toHaveBeenCalledTimes(1);
  });

  it('stop disconnects once and survives a later abort', async () => {
    const { fs } = setup();
    const disconnect = vi.fn();
    class FakeObserver {
      observe = vi.fn(async () => undefined);
      disconnect = disconnect;
    }
    vi.stubGlobal('FileSystemObserver', FakeObserver);

    const controller = new AbortController();
    const { armed, stop } = await fs.watch(() => undefined, {
      signal: controller.signal,
    });
    expect(armed).toBe(true);

    // Callers re-arming a watcher stop the old one; the signal firing later
    // must not disconnect a second time.
    stop();
    stop();
    controller.abort();
    expect(disconnect).toHaveBeenCalledTimes(1);
  });

  it('requires read permission to watch', async () => {
    const { fs, root } = setup();
    root.permissions.read = 'prompt';
    class FakeObserver {
      observe = vi.fn();
      disconnect = vi.fn();
    }
    vi.stubGlobal('FileSystemObserver', FakeObserver);
    const controller = new AbortController();
    const error = await fs
      .watch(() => undefined, { signal: controller.signal })
      .catch((e) => e);
    expect(isNativeFsError(error, NATIVE_FS_ERROR_CODE.permissionDenied)).toBe(
      true,
    );
  });
});
