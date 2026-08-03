import { expect, test } from '@playwright/test';
import {
  collapseEditorSelection,
  collapseEditorSelectionAfterText,
  getEditorLocator,
  readSeededBrowserNote,
  seedBrowserWorkspaceAndNote,
  selectEditorText,
  waitForSeededBrowserNote,
} from './common';

test('shows, positions, toggles, and persists the desktop selection toolbar', async ({
  page,
}) => {
  const source = 'bold plain wrapped selection text';
  const expected = '**bold** plain wrapped selection text';
  const seeded = await seedBrowserWorkspaceAndNote(page, {
    initialMarkdown: source,
    noteName: 'Formatting',
    workspaceName: 'selection-formatting',
  });
  const editor = getEditorLocator(page, {});
  const toolbar = page.getByRole('toolbar', { name: 'Text formatting' });
  const bold = toolbar.getByRole('button', { name: 'Bold' });

  await selectEditorText(page, 'bold');
  await expect(toolbar).toBeVisible();
  await expect(bold).toHaveAttribute('aria-pressed', 'false');
  await bold.click();
  await expect(toolbar).toBeVisible();
  await expect(bold).toHaveAttribute('aria-pressed', 'true');
  await expect(editor.locator('strong')).toHaveText('bold');

  await collapseEditorSelection(page, 1);
  await expect(toolbar).toBeHidden();
  await selectEditorText(page, 'plain');
  await page.keyboard.press('Escape');
  await expect(toolbar).toBeHidden();

  await editor.evaluate((element) => {
    element.setAttribute('style', 'width: 180px; max-width: 180px');
  });
  await selectEditorText(page, 'wrapped selection text');
  await expect(toolbar).toBeVisible();
  await expect
    .poll(() =>
      page.evaluate(() => {
        const selection = window.getSelection();
        const menu = document.querySelector(
          '[role="toolbar"][aria-label="Text formatting"]',
        );
        if (!selection?.rangeCount || !menu) return false;
        const rects = Array.from(selection.getRangeAt(0).getClientRects());
        const first = rects[0];
        const menuRect = menu.getBoundingClientRect();
        const verticalOffset = first ? first.top - menuRect.bottom : 0;
        return Boolean(
          first &&
            rects.length >= 2 &&
            menuRect.top < first.top &&
            verticalOffset >= 4 &&
            verticalOffset <= 12 &&
            menuRect.right >= first.left &&
            menuRect.left <= first.right,
        );
      }),
    )
    .toBe(true);

  await expect.poll(() => readSeededBrowserNote(page, seeded)).toBe(expected);
  await page.reload({ waitUntil: 'domcontentloaded' });
  await waitForSeededBrowserNote(page, seeded);
  await expect(getEditorLocator(page, {}).locator('strong')).toHaveText('bold');
  await expect.poll(() => readSeededBrowserNote(page, seeded)).toBe(expected);
});

test('creates, expands, cancels, edits, and removes a selected-text link', async ({
  page,
}) => {
  const source = 'visit example today';
  const created = 'visit [example](https://one.example/) today';
  const updated = 'visit [example](https://two.example/) today';
  const seeded = await seedBrowserWorkspaceAndNote(page, {
    initialMarkdown: source,
    noteName: 'Links',
    workspaceName: 'selection-links',
  });
  const editor = getEditorLocator(page, {});
  const linkButton = page.getByRole('button', { name: 'Link', exact: true });
  const urlInput = page.getByRole('textbox', { name: 'Link URL' });

  await selectEditorText(page, 'example');
  await linkButton.click();
  await page.keyboard.insertText('one.example');
  await expect(urlInput).toBeFocused();
  await expect(urlInput).toHaveValue('one.example');
  await expect(editor).toHaveText(source);
  await urlInput.press('Enter');
  await expect.poll(() => readSeededBrowserNote(page, seeded)).toBe(created);

  // Opening the menu from part of a link expands to the complete mark before
  // editing, so Escape cannot alter a draft or split the link.
  await selectEditorText(page, 'amp');
  await linkButton.click();
  await expect(urlInput).toHaveValue('https://one.example/');
  await urlInput.fill('https://draft.example');
  await urlInput.press('Escape');
  await expect(urlInput).toBeHidden();
  await expect.poll(() => readSeededBrowserNote(page, seeded)).toBe(created);

  await selectEditorText(page, 'example');
  await linkButton.click();
  await urlInput.fill('two.example');
  await urlInput.press('Enter');
  await expect(editor.locator('a')).toHaveText('example');
  await expect.poll(() => readSeededBrowserNote(page, seeded)).toBe(updated);

  await selectEditorText(page, 'example');
  await linkButton.click();
  await page.getByRole('button', { name: 'Remove link' }).click();
  await expect(editor.locator('a')).toHaveCount(0);
  await expect.poll(() => readSeededBrowserNote(page, seeded)).toBe(source);
  await page.reload({ waitUntil: 'domcontentloaded' });
  await waitForSeededBrowserNote(page, seeded);
  await expect(getEditorLocator(page, {}).locator('a')).toHaveCount(0);
  await expect.poll(() => readSeededBrowserNote(page, seeded)).toBe(source);
});

test('copies, opens, and cancels a cursor-link draft without changing Markdown', async ({
  context,
  page,
}) => {
  const href = 'https://actions.example/docs/readme.md?mode=test#results';
  const source = `visit [example](${href})`;
  await context.grantPermissions(['clipboard-read', 'clipboard-write']);
  await context.route('https://actions.example/**', (route) =>
    route.fulfill({
      body: '<title>Opened link</title>',
      contentType: 'text/html',
      status: 200,
    }),
  );
  const seeded = await seedBrowserWorkspaceAndNote(page, {
    initialMarkdown: source,
    noteName: 'Cursor link',
    workspaceName: 'cursor-link-actions',
  });
  const urlInput = page.getByRole('textbox', { name: 'Link URL' });

  await collapseEditorSelection(page, 8);
  await expect(urlInput).toHaveValue(href);
  await page.getByRole('button', { name: 'Copy link' }).click();
  await expect(page.getByRole('button', { name: 'Copied!' })).toBeVisible();
  await expect
    .poll(() => page.evaluate(() => navigator.clipboard.readText()))
    .toBe(href);

  const pageErrors: Error[] = [];
  page.on('pageerror', (error) => pageErrors.push(error));
  await page.evaluate(() => {
    const clipboard = navigator.clipboard;
    const descriptor = Object.getOwnPropertyDescriptor(clipboard, 'writeText');
    const originalWriteText = clipboard.writeText;
    Object.assign(window, {
      __bangleTestRestoreClipboardWriteText: () => {
        if (descriptor) {
          Object.defineProperty(clipboard, 'writeText', descriptor);
        } else {
          Object.defineProperty(clipboard, 'writeText', {
            configurable: true,
            value: originalWriteText,
            writable: true,
          });
        }
      },
    });
    Object.defineProperty(clipboard, 'writeText', {
      configurable: true,
      value: () => Promise.reject(new Error('clipboard unavailable')),
    });
  });
  await page.getByRole('button', { name: 'Copied!' }).click();
  await expect(page.getByRole('button', { name: 'Copy failed' })).toBeVisible();
  expect(pageErrors).toHaveLength(0);
  await page.evaluate(() => {
    (
      window as typeof window & {
        __bangleTestRestoreClipboardWriteText?: () => void;
      }
    ).__bangleTestRestoreClipboardWriteText?.();
  });

  const openedPagePromise = context.waitForEvent('page');
  await page.getByRole('button', { name: 'Open link' }).click();
  const openedPage = await openedPagePromise;
  await expect.poll(() => openedPage.url()).toBe(href);
  await openedPage.close();

  await urlInput.fill('https://draft.example');
  await urlInput.press('Escape');
  await expect(urlInput).toBeHidden();
  await expect.poll(() => readSeededBrowserNote(page, seeded)).toBe(source);
});

test('keeps an invalid pre-existing Markdown link through rejection, cancel, and unrelated edits', async ({
  page,
}) => {
  const source = 'before [invalid](https://google%20com/) after';
  const edited = `${source}!`;
  const seeded = await seedBrowserWorkspaceAndNote(page, {
    initialMarkdown: source,
    noteName: 'Invalid link',
    workspaceName: 'invalid-markdown-link',
  });
  const editor = getEditorLocator(page, {});
  const urlInput = page.getByRole('textbox', { name: 'Link URL' });

  await expect(editor.getByRole('link', { name: 'invalid' })).toHaveAttribute(
    'href',
    'https://google%20com/',
  );
  await selectEditorText(page, 'invalid');
  await page.getByRole('button', { name: 'Link', exact: true }).click();
  await expect(urlInput).toHaveValue('https://google%20com/');
  await expect(urlInput).toHaveAttribute('aria-invalid', 'true');
  await expect(page.getByRole('alert')).toHaveText(
    'Enter a web address or Markdown path.',
  );
  await urlInput.press('Escape');
  await expect.poll(() => readSeededBrowserNote(page, seeded)).toBe(source);

  await collapseEditorSelectionAfterText(page, 'after');
  await page.keyboard.insertText('!');
  await expect.poll(() => readSeededBrowserNote(page, seeded)).toBe(edited);
  await page.reload({ waitUntil: 'domcontentloaded' });
  await waitForSeededBrowserNote(page, seeded);
  await expect(
    getEditorLocator(page, {}).getByRole('link', { name: 'invalid' }),
  ).toHaveAttribute('href', 'https://google%20com/');
  await expect.poll(() => readSeededBrowserNote(page, seeded)).toBe(edited);
});
