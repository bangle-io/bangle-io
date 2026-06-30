import { readdir, readFile, stat } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { expect, type Page } from '@playwright/test';

export const isDarwin = os.platform() === 'darwin';
export const ctrlKey = os.platform() === 'darwin' ? 'Meta' : 'Control';
export const EDITOR_SELECTOR = '.ProseMirror';
export const EDITOR_FOCUSED_SELECTOR = `${EDITOR_SELECTOR}.ProseMirror-focused`;
const DEFAULT_SLEEP_TIME = 20;

export async function pressAppShortcut(page: Page, key: string) {
  const isRuntimeDarwin = await page.evaluate(() => {
    const userAgentData = (
      navigator as Navigator & {
        userAgentData?: { platform?: string };
      }
    ).userAgentData;
    const platform = userAgentData?.platform || navigator.platform;
    const isMac = /^Mac/i.test(platform);
    const isIPhone = /^iPhone/i.test(platform);
    const isIPad =
      /^iPad/i.test(platform) || (isMac && navigator.maxTouchPoints > 1);

    return isMac || isIPhone || isIPad;
  });
  await page.keyboard.press(`${isRuntimeDarwin ? 'Meta' : 'Control'}+${key}`);
}

export function sleep(t = DEFAULT_SLEEP_TIME) {
  return new Promise((res) => setTimeout(res, t));
}

export function getEditorLocator(page: Page, _options: { editorId?: string }) {
  return page.locator(EDITOR_SELECTOR);
}
export async function waitForEditorFocus(
  page: Page,
  _options: { editorId?: string },
) {
  await page.locator(EDITOR_FOCUSED_SELECTOR).waitFor();
}

export async function getEditorText(
  page: Page,
  options: { editorId?: string },
) {
  const locator = getEditorLocator(page, options);
  return locator.innerText();
}

export async function expectNoPageHorizontalOverflow(page: Page) {
  await expect
    .poll(
      () =>
        page.evaluate(
          () =>
            document.documentElement.scrollWidth -
            document.documentElement.clientWidth,
        ),
      {
        message: 'Expected the page to avoid document-level horizontal scroll',
      },
    )
    .toBeLessThanOrEqual(1);
}

export async function clearEditor(page: Page, options: { editorId?: string }) {
  await waitForEditorFocus(page, options);

  const MAX_RETRY = 3;
  let attempt = 0;
  let lastError: Error | undefined;

  while (attempt < MAX_RETRY) {
    try {
      await page.keyboard.press(`${ctrlKey}+a`);
      await page.keyboard.press('Backspace');

      const text = await getEditorText(page, options);
      if (text.trim() === '') {
        return; // Success
      }
      lastError = new Error(`Editor not cleared after attempt ${attempt + 1}`);
    } catch (error) {
      lastError = error as Error;
    }

    attempt++;
    // Add a small delay between retries
    if (attempt < MAX_RETRY) {
      await sleep();
    }
  }

  throw new Error(
    `Failed to clear editor after ${MAX_RETRY} attempts: ${lastError?.message}`,
  );
}

export async function createBrowserWorkspaceAndNote(
  page: Page,
  { workspaceName, noteName }: { workspaceName: string; noteName: string },
) {
  await createBrowserWorkspace(page, { workspaceName });
  await page.getByRole('button', { name: 'New Note' }).click();
  await page.getByPlaceholder('Input a note name').fill(noteName);
  await page.getByRole('option', { name: 'Create' }).click();
  await expect(getEditorLocator(page, {})).toBeVisible();
}

export async function createBrowserWorkspace(
  page: Page,
  { workspaceName }: { workspaceName: string },
) {
  await page.goto('/');
  // The responsive sidebar opens as a modal sheet on touch-sized viewports.
  // Close it so the welcome-page workflow remains user-observable.
  if (await page.getByRole('dialog').isVisible()) {
    await page.keyboard.press('Escape');
  }
  await page.getByRole('button', { name: 'Create Workspace' }).click();
  await page
    .getByRole('radio', { name: 'Browser Save workspace data' })
    .click();
  await page.getByRole('button', { name: 'Next' }).click();
  await page.getByLabel('Workspace Name', { exact: true }).fill(workspaceName);
  await page.getByRole('button', { name: 'Create' }).click();
  await expect(
    page.getByRole('heading', { name: workspaceName }),
  ).toBeVisible();
}

type WorkspaceFixtureFile = {
  relativePath: string;
  bytes: number[];
};

async function readWorkspaceFixtureFiles(
  fixtureDirectory: string,
): Promise<WorkspaceFixtureFile[]> {
  const fixtureStat = await stat(fixtureDirectory);
  if (!fixtureStat.isDirectory()) {
    throw new Error(
      `Workspace fixture is not a directory: ${fixtureDirectory}`,
    );
  }

  const files: WorkspaceFixtureFile[] = [];
  const visit = async (directory: string) => {
    const entries = await readdir(directory, { withFileTypes: true });
    for (const entry of entries.sort((a, b) => a.name.localeCompare(b.name))) {
      const absolutePath = path.join(directory, entry.name);
      if (entry.isDirectory()) {
        await visit(absolutePath);
        continue;
      }
      if (!entry.isFile()) {
        throw new Error(
          `Workspace fixtures cannot contain links: ${absolutePath}`,
        );
      }

      files.push({
        relativePath: path
          .relative(fixtureDirectory, absolutePath)
          .split(path.sep)
          .join('/'),
        bytes: [...(await readFile(absolutePath))],
      });
    }
  };

  await visit(fixtureDirectory);
  return files;
}

/**
 * Creates a Browser workspace from a directory fixture and reloads the app.
 * Every regular file below the fixture directory is preserved byte-for-byte,
 * with its relative path becoming its path inside the workspace.
 */
export async function loadBrowserWorkspaceFixture(
  page: Page,
  fixtureDirectory: string,
  options: { workspaceName?: string } = {},
) {
  const workspaceName =
    options.workspaceName ?? path.basename(path.resolve(fixtureDirectory));
  const files = await readWorkspaceFixtureFiles(fixtureDirectory);
  if (files.length === 0) {
    throw new Error(`Workspace fixture contains no files: ${fixtureDirectory}`);
  }

  await createBrowserWorkspace(page, { workspaceName });
  await page.evaluate(
    async ({ workspace, fixtureFiles }) => {
      const request = indexedDB.open('baby-idb-db-3');
      const database = await new Promise<IDBDatabase>((resolve, reject) => {
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      });
      await new Promise<void>((resolve, reject) => {
        const transaction = database.transaction(
          'baby-idb-db-store-3',
          'readwrite',
        );
        transaction.oncomplete = () => resolve();
        transaction.onerror = () => reject(transaction.error);
        transaction.onabort = () => reject(transaction.error);
        const store = transaction.objectStore('baby-idb-db-store-3');
        for (const fixtureFile of fixtureFiles) {
          const fileName = fixtureFile.relativePath.split('/').at(-1);
          if (!fileName) {
            transaction.abort();
            throw new Error(
              `Invalid fixture path: ${fixtureFile.relativePath}`,
            );
          }
          store.put(
            new File([new Uint8Array(fixtureFile.bytes)], fileName),
            `${workspace}/${fixtureFile.relativePath}`,
          );
        }
      });
      database.close();
    },
    { workspace: workspaceName, fixtureFiles: files },
  );
  await page.reload({ waitUntil: 'networkidle' });

  return { workspaceName, files: files.map((file) => file.relativePath) };
}

/** Selects the first exact text occurrence through a real browser Range. */
export async function selectEditorText(page: Page, text: string) {
  await page.locator(EDITOR_SELECTOR).evaluate((editor, selectedText) => {
    editor.focus();
    const walker = document.createTreeWalker(editor, NodeFilter.SHOW_TEXT);
    const textNodes: Text[] = [];
    let node = walker.nextNode();
    while (node) {
      textNodes.push(node as Text);
      node = walker.nextNode();
    }

    const fullText = textNodes.map((textNode) => textNode.data).join('');
    const start = fullText.indexOf(selectedText);
    if (start < 0) {
      throw new Error(`Unable to find editor text: ${selectedText}`);
    }
    const end = start + selectedText.length;

    const resolveOffset = (offset: number) => {
      let consumed = 0;
      for (const textNode of textNodes) {
        const next = consumed + textNode.length;
        if (offset <= next) {
          return { node: textNode, offset: offset - consumed };
        }
        consumed = next;
      }
      throw new Error(`Unable to resolve editor offset: ${offset}`);
    };

    const from = resolveOffset(start);
    const to = resolveOffset(end);
    const range = document.createRange();
    range.setStart(from.node, from.offset);
    range.setEnd(to.node, to.offset);
    const selection = window.getSelection();
    selection?.removeAllRanges();
    selection?.addRange(range);
    document.dispatchEvent(new Event('selectionchange', { bubbles: true }));
  }, text);
}

export async function collapseEditorSelection(page: Page, offset: number) {
  await page.locator(EDITOR_SELECTOR).evaluate((editor, cursorOffset) => {
    editor.focus();
    const walker = document.createTreeWalker(editor, NodeFilter.SHOW_TEXT);
    let textNode = walker.nextNode();
    let consumed = 0;
    while (textNode instanceof Text) {
      if (cursorOffset <= consumed + textNode.length) {
        break;
      }
      consumed += textNode.length;
      textNode = walker.nextNode();
    }
    if (!(textNode instanceof Text)) {
      throw new Error(
        `Unable to resolve editor cursor offset: ${cursorOffset}`,
      );
    }
    const range = document.createRange();
    range.setStart(textNode, cursorOffset - consumed);
    range.collapse(true);
    const selection = window.getSelection();
    selection?.removeAllRanges();
    selection?.addRange(range);
    document.dispatchEvent(new Event('selectionchange', { bubbles: true }));
  }, offset);
}

export async function readStoredMarkdown(
  page: Page,
  workspaceName: string,
  noteName: string,
) {
  return page.evaluate(
    async ({ workspace, note }) => {
      const request = indexedDB.open('baby-idb-db-3');
      const database = await new Promise<IDBDatabase>((resolve, reject) => {
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      });
      const transaction = database.transaction(
        'baby-idb-db-store-3',
        'readonly',
      );
      const getRequest = transaction
        .objectStore('baby-idb-db-store-3')
        .get(`${workspace}/${note}.md`);
      const file = await new Promise<File | undefined>((resolve, reject) => {
        getRequest.onsuccess = () => resolve(getRequest.result);
        getRequest.onerror = () => reject(getRequest.error);
      });
      database.close();
      return file?.text();
    },
    { workspace: workspaceName, note: noteName },
  );
}

/** Replaces a Browser-workspace note to simulate Markdown from outside the editor. */
export async function writeStoredMarkdown(
  page: Page,
  workspaceName: string,
  noteName: string,
  markdown: string,
) {
  await page.evaluate(
    async ({ workspace, note, content }) => {
      const request = indexedDB.open('baby-idb-db-3');
      const database = await new Promise<IDBDatabase>((resolve, reject) => {
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      });
      await new Promise<void>((resolve, reject) => {
        const transaction = database.transaction(
          'baby-idb-db-store-3',
          'readwrite',
        );
        transaction.oncomplete = () => resolve();
        transaction.onerror = () => reject(transaction.error);
        transaction.onabort = () => reject(transaction.error);
        transaction
          .objectStore('baby-idb-db-store-3')
          .put(
            new File([content], `${note}.md`, { type: 'text/markdown' }),
            `${workspace}/${note}.md`,
          );
      });
      database.close();
    },
    { workspace: workspaceName, note: noteName, content: markdown },
  );
}
