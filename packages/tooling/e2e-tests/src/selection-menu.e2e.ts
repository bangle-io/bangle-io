import { expect, test } from '@playwright/test';
import {
  collapseEditorSelection,
  createBrowserWorkspaceAndNote,
  getEditorLocator,
  readStoredMarkdown,
  selectEditorText,
  writeStoredMarkdown,
} from './common';

test('formats selected text, dismisses safely, anchors wrapped selections, and persists Markdown', async ({
  page,
}) => {
  const workspaceName = 'selection-formatting';
  const noteName = 'formatting';
  const content = 'bold italic strike code plain wrapped selection text';
  await createBrowserWorkspaceAndNote(page, { workspaceName, noteName });
  const editor = getEditorLocator(page, {});
  await editor.click();
  await page.keyboard.insertText(content);

  const toolbar = page.getByRole('toolbar', { name: 'Text formatting' });

  await page.keyboard.press('ControlOrMeta+a');
  await expect(toolbar).toBeVisible();
  await expect
    .poll(() => page.evaluate(() => window.getSelection()?.toString()))
    .toBe(content);
  await collapseEditorSelection(page, 2);
  await expect(toolbar).toBeHidden();

  const cases = [
    { text: 'bold', button: 'Bold' },
    { text: 'italic', button: 'Italic' },
    { text: 'strike', button: 'Strikethrough' },
    { text: 'code', button: 'Inline code' },
  ] as const;

  for (const { text, button } of cases) {
    await selectEditorText(page, text);
    await expect(toolbar).toBeVisible();
    const toggle = page.getByRole('button', { name: button });
    await expect(toggle).toBeEnabled();
    await expect(toggle).toHaveAttribute('aria-pressed', 'false');
    await toggle.click();
    await expect(toolbar).toBeVisible();
    await expect(toggle).toHaveAttribute('aria-pressed', 'true');
    await toggle.click();
    await expect(toolbar).toBeVisible();
    await expect(toggle).toHaveAttribute('aria-pressed', 'false');
    await toggle.click();
    await expect(toggle).toHaveAttribute('aria-pressed', 'true');
  }

  await selectEditorText(page, 'plain');
  await expect(
    page.getByRole('button', { name: 'Link', exact: true }),
  ).toBeEnabled();
  await page.getByRole('button', { name: 'Toggle Max Width' }).click();
  await expect(toolbar).toBeHidden();

  await selectEditorText(page, 'plain');
  await page.keyboard.press('Escape');
  await expect(toolbar).toBeHidden();

  await selectEditorText(page, 'plain');
  await collapseEditorSelection(page, 2);
  await expect(toolbar).toBeHidden();

  await editor.evaluate((element) => {
    element.setAttribute('style', 'width: 220px; max-width: 220px');
  });
  await selectEditorText(page, 'plain wrapped selection text');
  await expect(toolbar).toBeVisible();
  await expect
    .poll(async () =>
      page.evaluate(() => {
        const selection = window.getSelection();
        const menu = document.querySelector(
          '[role="toolbar"][aria-label="Text formatting"]',
        );
        if (!selection?.rangeCount || !menu) {
          return false;
        }
        const rects = Array.from(selection.getRangeAt(0).getClientRects());
        const menuRect = menu.getBoundingClientRect();
        const first = rects[0];
        if (!first) {
          return false;
        }
        const horizontalDistance = Math.abs(
          menuRect.left + menuRect.width / 2 - (first.left + first.width / 2),
        );
        return (
          rects.length >= 2 &&
          horizontalDistance < 180 &&
          Math.abs(first.top - menuRect.bottom) < 80
        );
      }),
    )
    .toBe(true);

  await editor.evaluate((element) => {
    element.setAttribute('style', 'width: 180px; max-width: 180px');
  });
  await expect
    .poll(async () =>
      page.evaluate(() => {
        const selection = window.getSelection();
        const menu = document.querySelector(
          '[role="toolbar"][aria-label="Text formatting"]',
        );
        if (!selection?.rangeCount || !menu) {
          return false;
        }
        const first = selection.getRangeAt(0).getClientRects()[0];
        const menuRect = menu.getBoundingClientRect();
        return Boolean(first && Math.abs(first.top - menuRect.bottom) < 80);
      }),
    )
    .toBe(true);

  const expectedMarkdown =
    '**bold** _italic_ ~~strike~~ `code` plain wrapped selection text';
  await expect
    .poll(() => readStoredMarkdown(page, workspaceName, noteName))
    .toBe(expectedMarkdown);

  await page.reload({ waitUntil: 'networkidle' });
  await expect(editor.locator('strong')).toHaveText('bold');
  await expect(editor.locator('em')).toHaveText('italic');
  await expect(editor.locator('s')).toHaveText('strike');
  await expect(editor.locator('code')).toHaveText('code');
  await expect
    .poll(() => readStoredMarkdown(page, workspaceName, noteName))
    .toBe(expectedMarkdown);
});

test('creates, expands, edits, cancels, and removes links without draft mutations', async ({
  page,
}) => {
  const workspaceName = 'selection-links';
  const noteName = 'links';
  const initialMarkdown = 'visit example today';
  await createBrowserWorkspaceAndNote(page, { workspaceName, noteName });
  const editor = getEditorLocator(page, {});
  await editor.click();
  await page.keyboard.insertText(initialMarkdown);
  await expect
    .poll(() => readStoredMarkdown(page, workspaceName, noteName))
    .toBe(initialMarkdown);

  const toolbar = page.getByRole('toolbar', { name: 'Text formatting' });
  const urlInput = page.getByRole('textbox', { name: 'Link URL' });

  await selectEditorText(page, 'example');
  await page.getByRole('button', { name: 'Link', exact: true }).click();
  await urlInput.fill('google com');
  await urlInput.press('Enter');
  await expect(
    page.getByRole('alert').getByText('Enter a valid web address.'),
  ).toBeVisible();
  await expect
    .poll(() =>
      page.getByTestId('link-editor').evaluate((element) => {
        const input = element.querySelector('input');
        const alert = element.querySelector('[role="alert"]');
        if (!input || !alert) {
          return false;
        }
        const inputStyle = getComputedStyle(input);
        const alertStyle = getComputedStyle(alert);
        return (
          inputStyle.color !== alertStyle.color &&
          inputStyle.borderTopWidth === '1px' &&
          inputStyle.borderTopColor !== 'rgba(0, 0, 0, 0)'
        );
      }),
    )
    .toBe(true);
  await expect
    .poll(() =>
      page.getByTestId('link-editor').evaluate((element) => {
        const rect = element.getBoundingClientRect();
        return rect.width <= 300 && rect.height <= 80;
      }),
    )
    .toBe(true);
  await expect
    .poll(() => readStoredMarkdown(page, workspaceName, noteName))
    .toBe(initialMarkdown);

  await urlInput.press('Escape');
  await expect(toolbar).toBeVisible();
  await expect(urlInput).toBeHidden();
  await expect
    .poll(() => readStoredMarkdown(page, workspaceName, noteName))
    .toBe(initialMarkdown);

  await page.getByRole('button', { name: 'Link', exact: true }).click();
  await expect(
    page.getByRole('form', { name: 'Edit link' }).getByRole('button'),
  ).toHaveCount(0);
  await urlInput.fill('one.example');
  await page.getByRole('button', { name: 'Star this item' }).click();
  await expect(urlInput).toBeHidden();
  await expect(editor.locator('a')).toHaveAttribute(
    'href',
    'https://one.example/',
  );
  await expect
    .poll(() => readStoredMarkdown(page, workspaceName, noteName))
    .toBe('visit [example](https://one.example/) today');

  await selectEditorText(page, 'amp');
  await page.getByRole('button', { name: 'Link', exact: true }).click();
  await expect(urlInput).toHaveValue('https://one.example/');
  await expect
    .poll(() =>
      page.evaluate(() => {
        const view = (
          globalThis as typeof globalThis & {
            editorView?: {
              state: {
                doc: { textBetween: (from: number, to: number) => string };
                selection: { from: number; to: number };
              };
            };
          }
        ).editorView;
        return view
          ? view.state.doc.textBetween(
              view.state.selection.from,
              view.state.selection.to,
            )
          : undefined;
      }),
    )
    .toBe('example');
  await urlInput.fill('https://draft.example');
  await urlInput.press('Escape');
  await expect(toolbar).toBeVisible();
  await expect
    .poll(() => readStoredMarkdown(page, workspaceName, noteName))
    .toBe('visit [example](https://one.example/) today');

  await page.getByRole('button', { name: 'Link', exact: true }).click();
  await urlInput.fill('https://two.example');
  await urlInput.press('Enter');
  await expect(editor.locator('a')).toHaveText('example');
  await expect
    .poll(() => readStoredMarkdown(page, workspaceName, noteName))
    .toBe('visit [example](https://two.example/) today');

  await collapseEditorSelection(page, 2);
  await selectEditorText(page, 'example');
  await page.getByRole('button', { name: 'Link', exact: true }).click();
  await urlInput.fill('google com');
  await page.getByRole('button', { name: 'Star this item' }).click();
  await expect(urlInput).toBeHidden();
  await expect
    .poll(() => readStoredMarkdown(page, workspaceName, noteName))
    .toBe('visit [example](https://two.example/) today');

  await collapseEditorSelection(page, 2);
  await selectEditorText(page, 'example');
  await page.getByRole('button', { name: 'Link', exact: true }).click();
  await urlInput.fill('https://outside.example');
  await page.getByRole('button', { name: 'Star this item' }).click();
  await expect(urlInput).toBeHidden();
  await expect
    .poll(() => readStoredMarkdown(page, workspaceName, noteName))
    .toBe('visit [example](https://outside.example/) today');

  await collapseEditorSelection(page, 8);
  await expect(urlInput).toHaveValue('https://outside.example/');
  await expect(toolbar).toBeHidden();
  await urlInput.fill('https://cursor.example');
  await page.getByRole('button', { name: 'Star this item' }).click();
  await expect(urlInput).toBeHidden();
  await expect
    .poll(() => readStoredMarkdown(page, workspaceName, noteName))
    .toBe('visit [example](https://cursor.example/) today');

  await selectEditorText(page, 'example');
  await page.getByRole('button', { name: 'Link', exact: true }).click();
  await page.getByRole('button', { name: 'Remove link' }).click();
  await expect(editor.locator('a')).toHaveCount(0);
  await expect
    .poll(() => readStoredMarkdown(page, workspaceName, noteName))
    .toBe(initialMarkdown);

  await page.reload({ waitUntil: 'networkidle' });
  await expect(editor).toHaveText(initialMarkdown);
  await expect(editor.locator('a')).toHaveCount(0);
});

test('copies, opens, and cancels cursor-link drafts', async ({
  context,
  page,
}) => {
  const workspaceName = 'cursor-link-actions';
  const noteName = 'actions';
  const initialMarkdown = 'visit example';
  const href = 'https://actions.example/path';
  await context.grantPermissions(['clipboard-read', 'clipboard-write']);
  await context.route('https://actions.example/**', (route) =>
    route.fulfill({
      body: '<title>Opened link</title>',
      contentType: 'text/html',
      status: 200,
    }),
  );
  await createBrowserWorkspaceAndNote(page, { workspaceName, noteName });
  const editor = getEditorLocator(page, {});
  await editor.click();
  await page.keyboard.insertText(initialMarkdown);

  await selectEditorText(page, 'example');
  await page.getByRole('button', { name: 'Link', exact: true }).click();
  const urlInput = page.getByRole('textbox', { name: 'Link URL' });
  await urlInput.fill(href);
  await urlInput.press('Enter');
  const linkedMarkdown = `visit [example](${href})`;
  await expect
    .poll(() => readStoredMarkdown(page, workspaceName, noteName))
    .toBe(linkedMarkdown);

  await collapseEditorSelection(page, 8);
  await expect(urlInput).toHaveValue(href);
  await page.getByRole('button', { name: 'Copy link' }).click();
  await expect(page.getByRole('button', { name: 'Copied!' })).toBeVisible();
  await expect
    .poll(() => page.evaluate(() => navigator.clipboard.readText()))
    .toBe(href);

  const openedPagePromise = context.waitForEvent('page');
  await page.getByRole('button', { name: 'Open link' }).click();
  const openedPage = await openedPagePromise;
  await expect.poll(() => openedPage.url()).toBe(href);
  await openedPage.close();

  await urlInput.fill('https://draft.example');
  await urlInput.press('Escape');
  await expect(urlInput).toBeHidden();
  await expect
    .poll(() => readStoredMarkdown(page, workspaceName, noteName))
    .toBe(linkedMarkdown);

  await collapseEditorSelection(page, 7);
  await expect(urlInput).toHaveValue(href);
  await urlInput.fill('google com');
  await page.getByRole('button', { name: 'Star this item' }).click();
  await expect(urlInput).toBeHidden();
  await expect
    .poll(() => readStoredMarkdown(page, workspaceName, noteName))
    .toBe(linkedMarkdown);
});

test('preserves pre-existing Markdown links rejected by the URL editor', async ({
  page,
}) => {
  const workspaceName = 'invalid-markdown-link';
  const noteName = 'invalid-link';
  const initialMarkdown = 'before [invalid](https://google%20com/) after';
  await createBrowserWorkspaceAndNote(page, { workspaceName, noteName });
  await writeStoredMarkdown(page, workspaceName, noteName, initialMarkdown);
  await page.reload({ waitUntil: 'networkidle' });

  const editor = getEditorLocator(page, {});
  const invalidLink = editor.getByRole('link', { name: 'invalid' });
  await expect(invalidLink).toHaveAttribute('href', 'https://google%20com/');
  await expect
    .poll(() => readStoredMarkdown(page, workspaceName, noteName))
    .toBe(initialMarkdown);

  await selectEditorText(page, 'invalid');
  await page.getByRole('button', { name: 'Link', exact: true }).click();
  await expect(page.getByRole('textbox', { name: 'Link URL' })).toHaveValue(
    'https://google%20com/',
  );
  await expect(
    page.getByRole('alert').getByText('Enter a valid web address.'),
  ).toBeVisible();
  await page.getByRole('textbox', { name: 'Link URL' }).press('Escape');
  await expect
    .poll(() => readStoredMarkdown(page, workspaceName, noteName))
    .toBe(initialMarkdown);

  await collapseEditorSelection(page, 'before invalid after'.length);
  await page.keyboard.insertText('!');
  const editedMarkdown = `${initialMarkdown}!`;
  await expect
    .poll(() => readStoredMarkdown(page, workspaceName, noteName))
    .toBe(editedMarkdown);

  await page.reload({ waitUntil: 'networkidle' });
  await expect(editor.getByRole('link', { name: 'invalid' })).toHaveAttribute(
    'href',
    'https://google%20com/',
  );
  await expect
    .poll(() => readStoredMarkdown(page, workspaceName, noteName))
    .toBe(editedMarkdown);
});

test('disables link formatting for a multi-block selection', async ({
  page,
}) => {
  await createBrowserWorkspaceAndNote(page, {
    workspaceName: 'selection-multiblock',
    noteName: 'multiblock',
  });
  const editor = getEditorLocator(page, {});
  await editor.click();
  await page.keyboard.insertText('first');
  await page.keyboard.press('Enter');
  await page.keyboard.insertText('second');
  await selectEditorText(page, 'firstsecond');
  await expect(
    page.getByRole('toolbar', { name: 'Text formatting' }),
  ).toBeVisible();
  await expect(
    page.getByRole('button', { name: 'Link', exact: true }),
  ).toBeDisabled();
  await expect(page.getByRole('button', { name: 'Bold' })).toBeEnabled();
});
