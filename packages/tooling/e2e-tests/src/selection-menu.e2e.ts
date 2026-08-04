import { expect, test } from '@playwright/test';
import {
  collapseEditorSelection,
  collapseEditorSelectionAfterText,
  ctrlKey,
  getEditorLocator,
  readSeededBrowserNote,
  readStoredMarkdown,
  seedBrowserWorkspaceAndNote,
  selectEditorText,
  waitForSeededBrowserNote,
  writeStoredMarkdown,
} from './common';

test('formats every inline mark and persists exact Markdown after reload', async ({
  page,
}) => {
  const source = 'bold italic strike code plain wrapped selection text';
  const expected =
    '**bold** _italic_ ~~strike~~ `code` plain wrapped selection text';
  const seeded = await seedBrowserWorkspaceAndNote(page, {
    initialMarkdown: source,
    noteName: 'Formatting',
    workspaceName: 'selection-formatting',
  });
  const editor = getEditorLocator(page, {});
  const toolbar = page.getByRole('toolbar', { name: 'Text formatting' });
  const marks = [
    { button: 'Bold', text: 'bold' },
    { button: 'Italic', text: 'italic' },
    { button: 'Strikethrough', text: 'strike' },
    { button: 'Inline code', text: 'code' },
  ] as const;

  await test.step('toggle each mark and verify its active-state transitions', async () => {
    for (const { button, text } of marks) {
      await test.step(button, async () => {
        await selectEditorText(page, text);
        const toggle = toolbar.getByRole('button', { name: button });
        await expect(toolbar).toBeVisible();
        await expect(toggle).toBeEnabled();
        await expect(toggle).toHaveAttribute('aria-pressed', 'false');
        await toggle.click();
        await expect(toolbar).toBeVisible();
        await expect(toggle).toHaveAttribute('aria-pressed', 'true');
        await toggle.click();
        await expect(toggle).toHaveAttribute('aria-pressed', 'false');
        await toggle.click();
        await expect(toggle).toHaveAttribute('aria-pressed', 'true');
      });
    }
  });

  await test.step('dismiss and reposition the toolbar for a wrapped selection', async () => {
    await selectEditorText(page, 'plain');
    await page.keyboard.press('Escape');
    await expect(toolbar).toBeHidden();

    await selectEditorText(page, 'plain');
    await collapseEditorSelection(page, 2);
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
  });

  await test.step('verify exact combined Markdown and rendered marks after reload', async () => {
    await expect.poll(() => readSeededBrowserNote(page, seeded)).toBe(expected);
    await page.reload({ waitUntil: 'domcontentloaded' });
    await waitForSeededBrowserNote(page, seeded);
    const reloadedEditor = getEditorLocator(page, {});
    await expect(reloadedEditor.locator('strong')).toHaveText('bold');
    await expect(reloadedEditor.locator('em')).toHaveText('italic');
    await expect(reloadedEditor.locator('s')).toHaveText('strike');
    await expect(reloadedEditor.locator('code')).toHaveText('code');
    await expect.poll(() => readSeededBrowserNote(page, seeded)).toBe(expected);
  });
});

test('creates, expands, cancels, and outside-commits a selected-text link', async ({
  page,
}) => {
  const source = 'visit example today';
  const created = 'visit [example](https://one.example/) today';
  const outsideCommitted = 'visit [example](https://outside.example/) today';
  const seeded = await seedBrowserWorkspaceAndNote(page, {
    initialMarkdown: source,
    noteName: 'Links',
    workspaceName: 'selection-links',
  });
  const editor = getEditorLocator(page, {});
  const toolbar = page.getByRole('toolbar', { name: 'Text formatting' });
  const linkButton = toolbar.getByRole('button', { name: 'Link', exact: true });
  const urlInput = page.getByRole('textbox', { name: 'Link URL' });

  await test.step('focus the URL input immediately and create the link', async () => {
    await selectEditorText(page, 'example');
    await linkButton.click();
    await page.keyboard.insertText('one.example');
    await expect(urlInput).toBeFocused();
    await expect(urlInput).toHaveValue('one.example');
    await expect(editor).toHaveText(source);
    await urlInput.press('Enter');
    await expect.poll(() => readSeededBrowserNote(page, seeded)).toBe(created);
  });

  await test.step('expand a partial-link selection and cancel its draft', async () => {
    await selectEditorText(page, 'amp');
    await linkButton.click();
    await expect(urlInput).toHaveValue('https://one.example/');
    await urlInput.fill('https://draft.example');
    await urlInput.press('Escape');
    await expect(urlInput).toBeHidden();
    await expect.poll(() => readSeededBrowserNote(page, seeded)).toBe(created);
  });

  await test.step('commit on an outside click and preserve outside focus', async () => {
    await selectEditorText(page, 'example');
    await linkButton.click();
    await urlInput.fill('https://outside.example');
    const outsideButton = page.getByRole('button', {
      name: 'Toggle Max Width',
    });
    await outsideButton.click();
    await expect(urlInput).toBeHidden();
    await expect(outsideButton).toBeFocused();
    await expect
      .poll(() => readSeededBrowserNote(page, seeded))
      .toBe(outsideCommitted);
  });

  await test.step('keep the outside-committed link after reload', async () => {
    await page.reload({ waitUntil: 'domcontentloaded' });
    await waitForSeededBrowserNote(page, seeded);
    await expect(getEditorLocator(page, {}).locator('a')).toHaveAttribute(
      'href',
      'https://outside.example/',
    );
    await expect
      .poll(() => readSeededBrowserNote(page, seeded))
      .toBe(outsideCommitted);
  });
});

test('rejects a newly entered invalid link without changing Markdown', async ({
  page,
}) => {
  const source = 'visit example today';
  const seeded = await seedBrowserWorkspaceAndNote(page, {
    initialMarkdown: source,
    noteName: 'Invalid draft',
    workspaceName: 'selection-invalid-draft',
  });
  const editor = getEditorLocator(page, {});

  await test.step('submit an invalid draft and keep the selection unlinked', async () => {
    await selectEditorText(page, 'example');
    await page.getByRole('button', { name: 'Link', exact: true }).click();
    const urlInput = page.getByRole('textbox', { name: 'Link URL' });
    await urlInput.fill('google com');
    await urlInput.press('Enter');
    await expect(urlInput).toHaveAttribute('aria-invalid', 'true');
    await expect(page.getByRole('alert')).toHaveText(
      'Enter a web address or Markdown path.',
    );
    await expect(editor.locator('a')).toHaveCount(0);
    await expect.poll(() => readSeededBrowserNote(page, seeded)).toBe(source);
  });
});

test('creates and modifier-opens a relative Markdown fragment link', async ({
  page,
}) => {
  const workspaceName = 'selection-relative-link';
  const targetMarkdown = '# Target\n\n## Target Heading\n\ntarget content';
  const expectedSource = 'open [target](target.md#target-heading)';
  const seeded = await seedBrowserWorkspaceAndNote(page, {
    initialMarkdown: 'open target',
    noteName: 'source',
    workspaceName,
  });
  await writeStoredMarkdown(page, workspaceName, 'target', targetMarkdown);
  await page.reload({ waitUntil: 'domcontentloaded' });
  await waitForSeededBrowserNote(page, seeded);
  const editor = getEditorLocator(page, {});

  await test.step('create the relative fragment link through the selection toolbar', async () => {
    await selectEditorText(page, 'target');
    await page.getByRole('button', { name: 'Link', exact: true }).click();
    const urlInput = page.getByRole('textbox', { name: 'Link URL' });
    await urlInput.fill('target.md#target-heading');
    await urlInput.press('Enter');
    await expect
      .poll(() => readStoredMarkdown(page, workspaceName, 'source'))
      .toBe(expectedSource);
  });

  await test.step('modifier-open the target note and navigate to its fragment', async () => {
    const link = editor.getByRole('link', { name: 'target' });
    await page.keyboard.down(ctrlKey);
    await link.click();
    await page.keyboard.up(ctrlKey);

    await expect(
      page.getByLabel('breadcrumb').getByRole('button', { name: 'target.md' }),
    ).toBeVisible();
    await expect(
      getEditorLocator(page, {}).getByRole('heading', {
        name: 'Target Heading',
      }),
    ).toBeVisible();
    await expect
      .poll(() =>
        page.evaluate(() => window.getSelection()?.anchorNode?.textContent),
      )
      .toBe('Target Heading');
  });
});

test('copies, opens, cancels, Enter-updates, and removes a cursor link', async ({
  context,
  page,
}) => {
  const href = 'https://actions.example/docs/readme.md?mode=test#results';
  const updatedHref = 'https://cursor.example/';
  const source = `visit [example](${href})`;
  const updated = `visit [example](${updatedHref})`;
  const unlinked = 'visit example';
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

  await test.step('copy the cursor link and report clipboard failure safely', async () => {
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
      const descriptor = Object.getOwnPropertyDescriptor(
        clipboard,
        'writeText',
      );
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
    await expect(
      page.getByRole('button', { name: 'Copy failed' }),
    ).toBeVisible();
    expect(pageErrors).toHaveLength(0);
    await page.evaluate(() => {
      (
        window as typeof window & {
          __bangleTestRestoreClipboardWriteText?: () => void;
        }
      ).__bangleTestRestoreClipboardWriteText?.();
    });
  });

  await test.step('open the cursor link', async () => {
    const openedPagePromise = context.waitForEvent('page');
    await page.getByRole('button', { name: 'Open link' }).click();
    const openedPage = await openedPagePromise;
    await expect.poll(() => openedPage.url()).toBe(href);
    await openedPage.close();
  });

  await test.step('cancel a cursor-link draft without changing Markdown', async () => {
    await urlInput.fill('https://draft.example');
    await urlInput.press('Escape');
    await expect(urlInput).toBeHidden();
    await expect.poll(() => readSeededBrowserNote(page, seeded)).toBe(source);
  });

  await test.step('update the cursor link with Enter', async () => {
    await collapseEditorSelection(page, 2);
    await collapseEditorSelection(page, 8);
    await expect(urlInput).toHaveValue(href);
    await urlInput.fill(updatedHref);
    await urlInput.press('Enter');
    await expect.poll(() => readSeededBrowserNote(page, seeded)).toBe(updated);
  });

  await test.step('remove the updated link from a cursor', async () => {
    // Enter dismisses the editor while leaving the caret in the link. Move the
    // caret away and back so this step proves cursor-driven reopening.
    await collapseEditorSelection(page, 2);
    await collapseEditorSelection(page, 8);
    await expect(urlInput).toHaveValue(updatedHref);
    await page.getByRole('button', { name: 'Remove link' }).click();
    await expect(getEditorLocator(page, {}).locator('a')).toHaveCount(0);
    await expect.poll(() => readSeededBrowserNote(page, seeded)).toBe(unlinked);
  });
});

test('disables links for multi-block and wiki-atom selections', async ({
  page,
}) => {
  const source = 'first\n\nsecond\n\nbefore [[Target]] after';
  const seeded = await seedBrowserWorkspaceAndNote(page, {
    initialMarkdown: source,
    noteName: 'Link constraints',
    workspaceName: 'selection-link-constraints',
  });
  const toolbar = page.getByRole('toolbar', { name: 'Text formatting' });
  const link = toolbar.getByRole('button', { name: 'Link', exact: true });
  const bold = toolbar.getByRole('button', { name: 'Bold' });

  await test.step('multi-block selection', async () => {
    await selectEditorText(page, 'firstsecond');
    await expect(toolbar).toBeVisible();
    await expect(link).toBeDisabled();
    await expect(bold).toBeEnabled();
  });

  await test.step('selection containing an atomic wiki link', async () => {
    await selectEditorText(page, 'before Target after');
    await expect(toolbar).toBeVisible();
    await expect(link).toBeDisabled();
    await expect(bold).toBeEnabled();
    await expect.poll(() => readSeededBrowserNote(page, seeded)).toBe(source);
  });
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

  await test.step('reject the invalid URL without mutating its existing mark', async () => {
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
  });

  await test.step('preserve the invalid link through another edit and reload', async () => {
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
});
