import { expect, test } from '@playwright/test';
import {
  collapseEditorSelectionAfterText,
  ctrlKey,
  getEditorLocator,
  readSeededBrowserNote,
  seedBrowserWorkspaceAndNote,
  waitForEditorFocus,
  waitForSeededBrowserNote,
} from './common';

const BODY = 'body text';
const INSERTED_SOURCE = '---\ntitle: Hello\n---\n\nbody text';
const TYPED_SOURCE = [
  '---',
  'k: v',
  '  title: typed',
  '---',
  '',
  'body text',
  '',
  '---',
].join('\n');
const MALFORMED_SOURCE = [
  '---',
  'title: [unclosed',
  ': dangling',
  '\tkey = {broken',
  '---',
  '',
  'body',
].join('\n');
const RECOVERED_MALFORMED_SOURCE = MALFORMED_SOURCE.replace(
  'body',
  'body edit',
);

test('slash insertion restores focus, prevents duplicates, and recovers deleted frontmatter through undo', async ({
  page,
}) => {
  const seeded = await seedBrowserWorkspaceAndNote(page, {
    initialMarkdown: BODY,
    noteName: 'Home',
    workspaceName: 'frontmatter-slash',
  });
  const editor = getEditorLocator(page, {});
  const frontmatterOption = page.getByRole('option', { name: 'Frontmatter' });

  await collapseEditorSelectionAfterText(page, BODY);
  await page.keyboard.press('Enter');
  await page.keyboard.insertText('/');
  await expect(frontmatterOption).toBeVisible();
  // Mouse selection must return focus to the new frontmatter block, so this
  // metadata is typed without another editor click.
  await frontmatterOption.click();
  await waitForEditorFocus(page, {});
  await page.keyboard.insertText('title: Hello');

  const frontmatterBlock = editor.locator(':scope > pre[data-frontmatter]');
  await expect(frontmatterBlock).toHaveCount(1);
  await expect(frontmatterBlock).toContainText('title: Hello');
  await expect
    .poll(() => readSeededBrowserNote(page, seeded))
    .toBe(INSERTED_SOURCE);

  await page.keyboard.press('ArrowDown');
  await page.keyboard.insertText('/');
  await expect(page.getByRole('option', { name: 'Heading 1' })).toBeVisible();
  await expect(frontmatterOption).toHaveCount(0);
  await page.keyboard.press('Escape');
  // Escape intentionally preserves the abandoned slash query; remove it as
  // ordinary document text before proving the duplicate check was write-safe.
  await page.keyboard.press('Backspace');
  await expect
    .poll(() => readSeededBrowserNote(page, seeded))
    .toBe(INSERTED_SOURCE);

  const deleteFrontmatter = editor.getByRole('button', {
    name: 'Delete frontmatter',
  });
  await deleteFrontmatter.focus();
  await deleteFrontmatter.press('Enter');
  await expect(editor.locator('pre[data-frontmatter]')).toHaveCount(0);
  await waitForEditorFocus(page, {});
  await expect.poll(() => readSeededBrowserNote(page, seeded)).toBe(BODY);

  await editor.press(`${ctrlKey}+z`);
  await expect(editor.locator(':scope > pre[data-frontmatter]')).toContainText(
    'title: Hello',
  );
  await expect
    .poll(() => readSeededBrowserNote(page, seeded))
    .toBe(INSERTED_SOURCE);

  await page.reload({ waitUntil: 'domcontentloaded' });
  await waitForSeededBrowserNote(page, seeded);
  await expect(
    getEditorLocator(page, {}).locator(':scope > pre[data-frontmatter]'),
  ).toContainText('title: Hello');
  await expect
    .poll(() => readSeededBrowserNote(page, seeded))
    .toBe(INSERTED_SOURCE);
});

test('typed frontmatter routes browser keys through YAML before later dashes become a horizontal rule', async ({
  page,
}) => {
  const seeded = await seedBrowserWorkspaceAndNote(page, {
    noteName: 'Home',
    workspaceName: 'frontmatter-key-routing',
  });
  const editor = getEditorLocator(page, {});

  await editor.click();
  await waitForEditorFocus(page, {});
  await page.keyboard.type('---');
  const frontmatterBlock = editor.locator('pre[data-frontmatter]');
  await expect(frontmatterBlock).toBeVisible();

  // A direct Backspace would undo the input rule and restore literal dashes.
  // Clear that undo state first, then exercise the empty-block keymap.
  await page.keyboard.type('x');
  await page.keyboard.press('Backspace');
  await page.keyboard.press('Backspace');
  await expect(frontmatterBlock).toHaveCount(0);
  await expect.poll(() => readSeededBrowserNote(page, seeded)).toBe('');

  await page.keyboard.type('---');
  await page.keyboard.type('title: typed');
  await page.keyboard.press('ArrowUp');
  await page.keyboard.press('ArrowUp');
  await page.keyboard.type('k: v');
  await page.keyboard.press('Enter');
  await page.keyboard.press('Tab');
  await page.keyboard.press('End');
  await page.keyboard.press('ArrowDown');
  await page.keyboard.type(BODY);
  await page.keyboard.press('Enter');
  await page.keyboard.type('---');

  await expect(frontmatterBlock).toContainText('k: v');
  await expect(frontmatterBlock).toContainText('  title: typed');
  await expect(editor.locator('hr')).toHaveCount(1);
  await expect
    .poll(() => readSeededBrowserNote(page, seeded))
    .toBe(TYPED_SOURCE);

  await page.reload({ waitUntil: 'domcontentloaded' });
  await waitForSeededBrowserNote(page, seeded);
  await expect(getEditorLocator(page, {}).locator('hr')).toHaveCount(1);
  await expect
    .poll(() => readSeededBrowserNote(page, seeded))
    .toBe(TYPED_SOURCE);
});

test('direct-seeded malformed frontmatter remains byte-for-byte intact while body edits recover normally', async ({
  page,
}) => {
  const seeded = await seedBrowserWorkspaceAndNote(page, {
    initialMarkdown: MALFORMED_SOURCE,
    noteName: 'Home',
    workspaceName: 'frontmatter-malformed',
  });
  const editor = getEditorLocator(page, {});
  const frontmatterBlock = editor.locator(':scope > pre[data-frontmatter]');

  await expect(frontmatterBlock).toContainText('title: [unclosed');
  await expect(frontmatterBlock).toContainText('\tkey = {broken');
  await expect
    .poll(() => readSeededBrowserNote(page, seeded))
    .toBe(MALFORMED_SOURCE);

  await collapseEditorSelectionAfterText(page, 'body');
  await page.keyboard.insertText(' edit');
  await expect
    .poll(() => readSeededBrowserNote(page, seeded))
    .toBe(RECOVERED_MALFORMED_SOURCE);

  await page.reload({ waitUntil: 'domcontentloaded' });
  await waitForSeededBrowserNote(page, seeded);
  await expect(
    getEditorLocator(page, {}).locator(':scope > pre[data-frontmatter]'),
  ).toContainText('\tkey = {broken');
  await expect
    .poll(() => readSeededBrowserNote(page, seeded))
    .toBe(RECOVERED_MALFORMED_SOURCE);
});
