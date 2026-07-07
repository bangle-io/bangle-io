import { expect, test } from '@playwright/test';
import {
  createBrowserWorkspaceAndNote,
  getEditorLocator,
  readStoredMarkdown,
  waitForEditorFocus,
} from './common';

test('inserts frontmatter at the top via the slash menu and persists it', async ({
  page,
}) => {
  const workspaceName = 'fm-slash-insert';
  await createBrowserWorkspaceAndNote(page, {
    workspaceName,
    noteName: 'Home',
  });

  const editor = getEditorLocator(page, {});
  await editor.click();
  await waitForEditorFocus(page, {});

  // Write body content first so the insert visibly lands above it.
  await page.keyboard.insertText('body text');
  await page.keyboard.press('Enter');

  await page.keyboard.insertText('/');
  const frontmatterOption = page.getByRole('option', { name: 'Frontmatter' });
  await expect(frontmatterOption).toBeVisible();
  await frontmatterOption.click();
  await page.keyboard.insertText('title: Hello');

  const frontmatterBlock = editor.locator('pre[data-frontmatter]');
  await expect(frontmatterBlock).toContainText('title: Hello');
  // The frontmatter block is the first child of the document.
  await expect(
    editor.locator('> pre[data-frontmatter]:first-child'),
  ).toBeVisible();

  await expect
    .poll(() => readStoredMarkdown(page, workspaceName, 'Home'))
    .toBe('---\ntitle: Hello\n---\n\nbody text');

  // The persisted markdown must survive a reload as the same structure.
  await page.reload();
  const reloadedEditor = getEditorLocator(page, {});
  await expect(reloadedEditor.locator('pre[data-frontmatter]')).toContainText(
    'title: Hello',
  );
  await expect(reloadedEditor).toContainText('body text');

  // The header-band Delete button removes the whole block, content and all.
  await reloadedEditor
    .getByRole('button', { name: 'Delete frontmatter' })
    .click();
  await expect(reloadedEditor.locator('pre[data-frontmatter]')).toHaveCount(0);
  await expect(reloadedEditor).toContainText('body text');
  await expect
    .poll(() => readStoredMarkdown(page, workspaceName, 'Home'))
    .toBe('body text');
});

test('does not offer a second frontmatter once one exists', async ({
  page,
}) => {
  const workspaceName = 'fm-slash-single';
  await createBrowserWorkspaceAndNote(page, {
    workspaceName,
    noteName: 'Home',
  });

  const editor = getEditorLocator(page, {});
  await editor.click();
  await waitForEditorFocus(page, {});

  await page.keyboard.insertText('/');
  const frontmatterOption = page.getByRole('option', { name: 'Frontmatter' });
  await expect(frontmatterOption).toBeVisible();
  await frontmatterOption.click();
  await page.keyboard.insertText('title: once');
  await expect(editor.locator('pre[data-frontmatter]')).toContainText(
    'title: once',
  );

  // Move to the body and open the slash menu again: the item is gone.
  await page.keyboard.press('ArrowDown');
  await page.keyboard.insertText('/');
  await expect(page.getByRole('option', { name: 'Heading 1' })).toBeVisible();
  await expect(page.getByRole('option', { name: 'Frontmatter' })).toBeHidden();
  await page.keyboard.press('Escape');

  await expect(editor.locator('pre[data-frontmatter]')).toHaveCount(1);
});

test('backspace removes an empty frontmatter block', async ({ page }) => {
  const workspaceName = 'fm-slash-remove';
  await createBrowserWorkspaceAndNote(page, {
    workspaceName,
    noteName: 'Home',
  });

  const editor = getEditorLocator(page, {});
  await editor.click();
  await waitForEditorFocus(page, {});
  await page.keyboard.insertText('body');
  await page.keyboard.press('Enter');

  await page.keyboard.insertText('/');
  const frontmatterOption = page.getByRole('option', { name: 'Frontmatter' });
  await expect(frontmatterOption).toBeVisible();
  await frontmatterOption.click();
  await expect(editor.locator('pre[data-frontmatter]')).toBeVisible();

  await page.keyboard.press('Backspace');

  await expect(editor.locator('pre[data-frontmatter]')).toHaveCount(0);
  await expect(editor).toContainText('body');
  await expect
    .poll(() => readStoredMarkdown(page, workspaceName, 'Home'))
    .toBe('body');
});

test('typing --- at the top of a note creates frontmatter', async ({
  page,
}) => {
  const workspaceName = 'fm-type-dashes';
  await createBrowserWorkspaceAndNote(page, {
    workspaceName,
    noteName: 'Home',
  });

  const editor = getEditorLocator(page, {});
  await editor.click();
  await waitForEditorFocus(page, {});

  await page.keyboard.type('---');
  const frontmatterBlock = editor.locator('pre[data-frontmatter]');
  await expect(frontmatterBlock).toBeVisible();

  await page.keyboard.type('title: typed');
  await expect(frontmatterBlock).toContainText('title: typed');
  await expect
    .poll(() => readStoredMarkdown(page, workspaceName, 'Home'))
    .toBe('---\ntitle: typed\n---');

  // Typing --- again below yields a horizontal rule, never a second
  // frontmatter.
  await page.keyboard.press('ArrowDown');
  await page.keyboard.type('---');
  await expect(editor.locator('hr')).toHaveCount(1);
  await expect(frontmatterBlock).toHaveCount(1);
  await expect
    .poll(() => readStoredMarkdown(page, workspaceName, 'Home'))
    .toBe('---\ntitle: typed\n---\n\n---');
});

test('ArrowUp on the top row keeps the cursor inside the block', async ({
  page,
}) => {
  const workspaceName = 'fm-arrow-up';
  await createBrowserWorkspaceAndNote(page, {
    workspaceName,
    noteName: 'Home',
  });

  const editor = getEditorLocator(page, {});
  await editor.click();
  await waitForEditorFocus(page, {});

  await page.keyboard.type('---');
  await page.keyboard.type('title: x');

  // The cursor must not escape above the first row into a dead gap cursor:
  // typing after repeated ArrowUp still lands inside the block.
  await page.keyboard.press('ArrowUp');
  await page.keyboard.press('ArrowUp');
  await page.keyboard.type('k: v');
  await page.keyboard.press('Enter');

  await expect(editor.locator('pre[data-frontmatter]')).toContainText('k: v');
  await expect
    .poll(() => readStoredMarkdown(page, workspaceName, 'Home'))
    .toBe('---\nk: v\ntitle: x\n---');
});
