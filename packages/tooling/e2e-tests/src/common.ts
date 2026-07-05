import { readdir, readFile, stat } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { expect, type Locator, type Page } from '@playwright/test';

export const isDarwin = os.platform() === 'darwin';
export const ctrlKey = os.platform() === 'darwin' ? 'Meta' : 'Control';
export const EDITOR_SELECTOR = '.ProseMirror';
export const EDITOR_FOCUSED_SELECTOR = `${EDITOR_SELECTOR}.ProseMirror-focused`;
const DEFAULT_SLEEP_TIME = 20;

/**
 * Presses an *app-level* keyboard shortcut (e.g. Cmd/Ctrl+K for omni-search).
 *
 * The modifier is resolved with the same `navigator.userAgentData?.platform ||
 * navigator.platform` check the app itself uses (see `isMac`/`isDarwin` in
 * @bangle.io/mini-js-utils), so the key we send always matches the modifier the
 * app bound its shortcut to. This matters because headless Chromium reports
 * `userAgentData.platform === 'Windows'` even on macOS: the app then treats
 * itself as non-Mac and binds Control, and this helper agrees.
 *
 * Do NOT use this for ProseMirror/editor shortcuts such as `Mod-a` (select
 * all). prosemirror-keymap resolves `Mod` from `navigator.platform` only
 * (→ Meta on a real Mac), which disagrees with the app's userAgentData-based
 * detection under headless Chromium. For editor selection, drive a real DOM
 * selection via `selectEditorText`/`clearEditor` instead of a keychord.
 */
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

function sleep(t = DEFAULT_SLEEP_TIME) {
  return new Promise((res) => setTimeout(res, t));
}

// Pierre's file tree uses a pointer-based drag that only engages once it sees
// pointer moves separated across animation frames; a synchronous
// `locator.dragTo` (or a single stepped move) collapses into a click that just
// selects the row. Drive the gesture with real mouse events and let a frame
// elapse between phases so the durable move actually fires.
export async function dragTreeItemOnto(
  page: Page,
  source: Locator,
  target: Locator,
) {
  const sourceBox = await source.boundingBox();
  const targetBox = await target.boundingBox();

  if (!sourceBox || !targetBox) {
    throw new Error('Expected drag source and target to be visible');
  }

  const sourceX = sourceBox.x + sourceBox.width / 2;
  const sourceY = sourceBox.y + sourceBox.height / 2;
  const targetX = targetBox.x + targetBox.width / 2;
  const targetY = targetBox.y + targetBox.height / 2;
  const settleFrame = () => page.waitForTimeout(60);

  await page.mouse.move(sourceX, sourceY);
  await page.mouse.down();
  await settleFrame();
  await page.mouse.move(sourceX, sourceY - 8);
  await settleFrame();
  await page.mouse.move((sourceX + targetX) / 2, (sourceY + targetY) / 2);
  await settleFrame();
  await page.mouse.move(targetX, targetY);
  await settleFrame();
  await page.mouse.move(targetX, targetY);
  await settleFrame();
  await page.mouse.up();
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

export async function expectReadableContrast(
  locator: Locator,
  options: { minimumRatio?: number } = {},
) {
  const minimumRatio = options.minimumRatio ?? 4.5;

  await expect
    .poll(
      () =>
        locator.evaluate((element) => {
          const parseColor = (value: string) => {
            const rgbMatch = /^rgba?\(([^)]+)\)$/.exec(value);
            if (rgbMatch?.[1]) {
              const [r, g, b] = rgbMatch[1]
                .split(/[\s,/]+/)
                .filter(Boolean)
                .slice(0, 3)
                .map((channel) => {
                  if (channel.endsWith('%')) {
                    return Number(channel.slice(0, -1)) / 100;
                  }
                  return Number(channel) / 255;
                });

              if (r === undefined || g === undefined || b === undefined) {
                throw new Error(`Unable to parse RGB color "${value}"`);
              }

              return srgbToLinearRgb({ r, g, b });
            }

            const oklchMatch = /^oklch\(([\d.]+%?)\s+([\d.]+)\s+([\d.]+)/.exec(
              value,
            );
            const [, rawLightness, rawChroma, rawHue] = oklchMatch ?? [];
            if (rawLightness && rawChroma && rawHue) {
              const lightness = rawLightness.endsWith('%')
                ? Number(rawLightness.slice(0, -1)) / 100
                : Number(rawLightness);
              return oklchToLinearSrgb({
                lightness,
                chroma: Number(rawChroma),
                hue: Number(rawHue),
              });
            }

            throw new Error(`Unable to parse color "${value}"`);
          };

          const srgbChannelToLinear = (channel: number) =>
            channel <= 0.04045
              ? channel / 12.92
              : ((channel + 0.055) / 1.055) ** 2.4;

          const srgbToLinearRgb = ({
            r,
            g,
            b,
          }: {
            r: number;
            g: number;
            b: number;
          }) => ({
            r: srgbChannelToLinear(r),
            g: srgbChannelToLinear(g),
            b: srgbChannelToLinear(b),
          });

          const oklchToLinearSrgb = ({
            lightness,
            chroma,
            hue,
          }: {
            lightness: number;
            chroma: number;
            hue: number;
          }) => {
            const hueRadians = (hue * Math.PI) / 180;
            const a = chroma * Math.cos(hueRadians);
            const b = chroma * Math.sin(hueRadians);

            const lPrime = lightness + 0.3963377774 * a + 0.2158037573 * b;
            const mPrime = lightness - 0.1055613458 * a - 0.0638541728 * b;
            const sPrime = lightness - 0.0894841775 * a - 1.291485548 * b;

            const l = lPrime ** 3;
            const m = mPrime ** 3;
            const s = sPrime ** 3;

            return {
              r: 4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
              g: -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
              b: -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s,
            };
          };

          const relativeLuminance = ({
            r,
            g,
            b,
          }: {
            r: number;
            g: number;
            b: number;
          }) => {
            const clamp = (channel: number) =>
              Math.min(1, Math.max(0, channel));
            return 0.2126 * clamp(r) + 0.7152 * clamp(g) + 0.0722 * clamp(b);
          };

          const style = getComputedStyle(element);
          const findEffectiveBackgroundColor = () => {
            let current: Element | null = element;

            while (current) {
              const backgroundColor = getComputedStyle(current).backgroundColor;
              if (!isTransparentColor(backgroundColor)) {
                return backgroundColor;
              }
              current = current.parentElement;
            }

            return getComputedStyle(document.body).backgroundColor;
          };

          const isTransparentColor = (value: string) => {
            if (value === 'transparent') {
              return true;
            }

            const rgbMatch = /^rgba?\(([^)]+)\)$/.exec(value);
            if (!rgbMatch?.[1]) {
              return false;
            }

            const color = rgbMatch[1].trim();
            const alphaFromSlash = /\/\s*([\d.]+%?)\s*$/.exec(color)?.[1];
            const alphaFromComma =
              alphaFromSlash === undefined && color.includes(',')
                ? color.split(',').at(3)?.trim()
                : undefined;
            const alpha = alphaFromSlash ?? alphaFromComma;
            if (alpha === undefined) {
              return false;
            }

            return alpha.endsWith('%')
              ? Number(alpha.slice(0, -1)) === 0
              : Number(alpha) === 0;
          };

          const foreground = relativeLuminance(parseColor(style.color));
          const background = relativeLuminance(
            parseColor(findEffectiveBackgroundColor()),
          );

          return (
            (Math.max(foreground, background) + 0.05) /
            (Math.min(foreground, background) + 0.05)
          );
        }),
      { message: `Expected readable contrast >= ${minimumRatio}` },
    )
    .toBeGreaterThanOrEqual(minimumRatio);
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
  await page.getByLabel('Note name').fill(noteName);
  await page.getByRole('button', { name: 'Create' }).click();
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

/** Writes an arbitrary Browser-workspace file to simulate external files. */
export async function writeStoredFile(
  page: Page,
  workspaceName: string,
  relativePath: string,
  content: string,
  type = 'text/plain',
) {
  await page.evaluate(
    async ({ workspace, filePath, content, type }) => {
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
        transaction.objectStore('baby-idb-db-store-3').put(
          new File([content], filePath.split('/').at(-1) ?? filePath, {
            type,
          }),
          `${workspace}/${filePath}`,
        );
      });
      database.close();
    },
    { workspace: workspaceName, filePath: relativePath, content, type },
  );
}
