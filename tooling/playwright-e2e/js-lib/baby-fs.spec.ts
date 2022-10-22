import type { Page } from '@playwright/test';
import { expect } from '@playwright/test';

import type { BabyFsInjected } from '@bangle.io/independent-e2e-tests-server';

import { testWithIndependentServer as test } from '../fixture-test-with-independent-server';

test.use({
  packageName: '@bangle.io/baby-fs',
});

async function createNativeFSHandle(page: Page, parentDir: string) {
  return page.evaluateHandle(async (parentDir) => {
    const { NativeBrowserFileSystem }: BabyFsInjected = (window as any)
      .injected;
    const rootDir = await navigator.storage.getDirectory();

    return new NativeBrowserFileSystem({
      rootDirHandle: await rootDir.getDirectoryHandle(parentDir, {
        create: true,
      }),
    });
  }, parentDir);
}

async function writeFile(
  fsHandle: Awaited<ReturnType<typeof createNativeFSHandle>>,
  path: string,
  textContent = 'hello world',
) {
  return fsHandle.evaluate(
    async (fs, { path, textContent }) => {
      await fs.writeFile(
        path,
        new File([textContent], "this-field-doesn't-matter", {
          type: 'text/plain',
        }),
      );
    },
    { path, textContent },
  );
}

async function readFileAsText(
  fsHandle: Awaited<ReturnType<typeof createNativeFSHandle>>,
  path: string,
) {
  return fsHandle.evaluate(async (fs, path) => {
    return fs.readFileAsText(path);
  }, path);
}

test.describe('baby-fs', () => {
  let page: Page;

  test.beforeEach(async ({ independent }) => {
    page = await independent.open();
    await expect(page.locator('body')).toContainText('hello-baby-fs');
  });

  test('reads and writes the file', async () => {
    const fs = await createNativeFSHandle(page, 'test-parent');
    await writeFile(fs, 'test-parent/foo.txt');
    expect(await readFileAsText(fs, 'test-parent/foo.txt')).toBe('hello world');
  });

  test('opendirRecursive: filtering works', async () => {
    let fs = await page.evaluateHandle(async () => {
      const { NativeBrowserFileSystem }: BabyFsInjected = (window as any)
        .injected;
      const rootDir = await navigator.storage.getDirectory();
      const handle = await rootDir.getDirectoryHandle('parent', {
        create: true,
      });

      return new NativeBrowserFileSystem({
        rootDirHandle: handle,
      });
    });

    await writeFile(fs, 'parent/foo.txt');
    await writeFile(fs, 'parent/test-not-allowed-file.txt');
    await writeFile(fs, 'parent/not-allowed-dir/magic.txt');
    await writeFile(fs, 'parent/not-allowed-dir/not-allowed-file.txt');
    await writeFile(fs, 'parent/apple/not-allowed-dir/not-allowed-file.txt');
    await writeFile(fs, 'parent/apple/orange/not-allowed-file.txt');
    await writeFile(fs, 'parent/apple/orange/other.txt');

    expect(await fs.evaluate((fs) => fs.opendirRecursive('parent'))).toEqual([
      'parent/test-not-allowed-file.txt',
      'parent/not-allowed-dir/not-allowed-file.txt',
      'parent/not-allowed-dir/magic.txt',
      'parent/foo.txt',
      'parent/apple/orange/other.txt',
      'parent/apple/orange/not-allowed-file.txt',
      'parent/apple/not-allowed-dir/not-allowed-file.txt',
    ]);

    // implement file filtering
    fs = await page.evaluateHandle(async () => {
      const { NativeBrowserFileSystem }: BabyFsInjected = (window as any)
        .injected;
      const rootDir = await navigator.storage.getDirectory();
      const handle = await rootDir.getDirectoryHandle('parent', {
        create: true,
      });

      return new NativeBrowserFileSystem({
        rootDirHandle: handle,
        allowedDir: (dir) => !dir.name.includes('not-allowed-dir'),
        allowedFile: (file) => !file.name.includes('not-allowed-file'),
      });
    });

    expect(await fs.evaluate((fs) => fs.opendirRecursive('parent'))).toEqual([
      'parent/foo.txt',
      'parent/apple/orange/other.txt',
    ]);
  });

  test('opendirRecursive works', async () => {
    const fs = await createNativeFSHandle(page, 'parent');

    let paths = [
      'parent/two/too2.txt',
      'parent/two/too.txt',
      'parent/one/foo2.txt',
      'parent/one/foo.txt',
      'parent/a/b/f/z.txt',
      'parent/a/b/c/d.txt',
    ];

    for (const p of paths) {
      await writeFile(fs, p);
    }

    expect(await fs.evaluate((fs) => fs.opendirRecursive('parent'))).toEqual(
      paths,
    );
  });

  test('rename works', async () => {
    const fs = await createNativeFSHandle(page, 'parent');
    await writeFile(fs, 'parent/one', 'test-val');

    await fs.evaluate((fs) => {
      return fs.rename('parent/one', 'parent/two');
    });

    expect(await readFileAsText(fs, 'parent/two')).toBe('test-val');

    let errorMessage = await readFileAsText(fs, 'parent/one').catch(
      (e) => e.message,
    );
    await expect(errorMessage).toMatch('File at "parent/one" not found');
  });

  test('stat works', async () => {
    const fs = await createNativeFSHandle(page, 'parent');
    await writeFile(fs, 'parent/one', 'test-val');

    expect(
      await fs.evaluate((fs) => {
        return fs.stat('parent/one');
      }),
    ).toEqual({
      mtimeMs: expect.any(Number),
    });
  });

  test('unlink works', async () => {
    const fs = await createNativeFSHandle(page, 'parent');
    await writeFile(fs, 'parent/one', 'test-val');

    expect(await readFileAsText(fs, 'parent/one')).toBe('test-val');

    await fs.evaluate((fs) => {
      return fs.unlink('parent/one');
    });

    expect(await fs.evaluate((fs) => fs.opendirRecursive('parent'))).toEqual(
      [],
    );

    let errorMessage = await readFileAsText(fs, 'parent/one').catch(
      (e) => e.message,
    );
    await expect(errorMessage).toMatch('File at "parent/one" not found');
  });
});
