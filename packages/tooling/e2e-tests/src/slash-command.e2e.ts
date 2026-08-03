import { expect, test } from '@playwright/test';
import {
  collapseEditorSelectionAfterText,
  getEditorLocator,
  readSeededBrowserNote,
  seedBrowserWorkspaceAndNote,
  waitForEditorFocus,
  waitForSeededBrowserNote,
} from './common';

test.use({ locale: 'en-US' });

const FIXED_CALENDAR_DATE = new Date('2028-12-15T12:00:00');

function formatDateLabel(date: Date): string {
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(date);
}

function daySelector(date: Date): string {
  return `[data-day="${date.toLocaleDateString('en-US')}"]`;
}

test('renders and filters the canonical slash menu, then mouse-inserts a persisted code block', async ({
  page,
}) => {
  const note = await seedBrowserWorkspaceAndNote(page, {
    noteName: 'Slash menu',
    workspaceName: 'slash-command-menu',
  });
  const editor = getEditorLocator(page, {});
  const menu = page.getByTestId('slash-command-menu');

  await editor.click();
  await waitForEditorFocus(page, {});
  await page.keyboard.insertText('/');
  await expect(menu).toBeVisible();
  await expect(menu.getByText('Basic blocks')).toBeVisible();
  await expect(menu.getByText('Lists', { exact: true })).toBeVisible();
  await expect(menu.getByText('Time', { exact: true })).toBeVisible();
  const heading = menu.getByRole('option', { name: /Heading 1/ });
  await expect(heading).toBeVisible();
  await expect(heading.locator('svg')).toBeVisible();
  await expect(heading.getByText('Large section heading')).toBeVisible();

  await page.keyboard.insertText('head');
  await expect(heading).toBeVisible();
  await expect(menu.getByText('Bullet list')).toBeHidden();
  await page.keyboard.insertText('zzzz');
  await expect(menu.getByText('No results')).toBeVisible();

  await page.keyboard.press('Escape');
  await page.keyboard.press('ControlOrMeta+a');
  await page.keyboard.press('Backspace');
  await page.keyboard.insertText('/');
  await expect(menu).toBeVisible();
  await menu.getByRole('option', { name: 'Code block' }).click();

  await expect(editor.locator('pre')).toBeVisible();
  await expect(editor).toBeFocused();
  await page.keyboard.insertText('const viaSlash = true;');
  const expected = '```\nconst viaSlash = true;\n```';
  await expect.poll(() => readSeededBrowserNote(page, note)).toBe(expected);

  await page.reload({ waitUntil: 'domcontentloaded' });
  await waitForSeededBrowserNote(page, note);
  await expect(editor.locator('pre code')).toContainText(
    'const viaSlash = true;',
  );
  await expect.poll(() => readSeededBrowserNote(page, note)).toBe(expected);
});

test('shows only available table-context slash actions', async ({ page }) => {
  const source = '| a | b |\n| --- | --- |\n| 1 | 2 |';
  const note = await seedBrowserWorkspaceAndNote(page, {
    initialMarkdown: source,
    noteName: 'Table context',
    workspaceName: 'slash-command-table-context',
  });
  const editor = getEditorLocator(page, {});
  const menu = page.getByTestId('slash-command-menu');

  await expect(editor.locator('table')).toBeVisible();
  await collapseEditorSelectionAfterText(page, '1');
  await page.keyboard.insertText(' /');
  await expect(menu).toBeVisible();
  await expect(menu.getByText('Table', { exact: true })).toBeVisible();
  await expect(menu.getByText('Heading 1')).toBeHidden();
  await expect(menu.getByText('Code block')).toBeHidden();
  await expect(menu.getByText('Bullet list')).toBeHidden();
  await expect(menu.getByText('Today', { exact: true })).toBeVisible();
  await expect(menu.getByText('Add row above')).toBeVisible();

  await menu.getByText('Add row below').click();
  const withBodyRow = [
    '| a | b |',
    '| --- | --- |',
    '| 1 | 2 |',
    '|  |  |',
  ].join('\n');
  await expect(editor.locator('table tr')).toHaveCount(3);
  await expect.poll(() => readSeededBrowserNote(page, note)).toBe(withBodyRow);

  await collapseEditorSelectionAfterText(page, 'a');
  await page.keyboard.insertText(' /');
  await expect(menu).toBeVisible();
  await expect(menu.getByText('Add row below')).toBeVisible();
  await expect(menu.getByText('Add row above')).toBeHidden();
});

test('uploads a file through the native chooser and persists it across reload', async ({
  page,
}) => {
  const note = await seedBrowserWorkspaceAndNote(page, {
    noteName: 'Slash upload',
    workspaceName: 'slash-command-upload-file',
  });
  const editor = getEditorLocator(page, {});

  await editor.click();
  await waitForEditorFocus(page, {});
  const menu = page.getByTestId('slash-command-menu');
  await page.keyboard.insertText('/');
  await expect(menu).toBeVisible();
  await page.keyboard.insertText('upload');
  const uploadFile = menu.getByRole('option', { name: /Upload file/ });
  await expect(uploadFile).toBeVisible();
  const fileChooserPromise = page.waitForEvent('filechooser');
  await uploadFile.click();
  const fileChooser = await fileChooserPromise;
  await fileChooser.setFiles({
    name: 'Slash Upload.pdf',
    mimeType: 'application/pdf',
    buffer: Buffer.from('%PDF-1.4\n'),
  });
  await expect(editor).toBeFocused();

  await expect
    .poll(() => readSeededBrowserNote(page, note))
    .toMatch(/^\[Slash Upload\.pdf\]\(assets\/slash-upload-.*\.pdf\)$/);
  const storedMarkdown = await readSeededBrowserNote(page, note);
  const assetPath = /^\[Slash Upload\.pdf\]\((assets\/[^)]+)\)$/.exec(
    storedMarkdown ?? '',
  )?.[1];
  if (!assetPath) throw new Error('Expected persisted Slash Upload asset path');

  await page.reload({ waitUntil: 'domcontentloaded' });
  await waitForSeededBrowserNote(page, note);
  const uploadedLink = editor.getByRole('link', { name: 'Slash Upload.pdf' });
  await expect(uploadedLink).toBeVisible();
  await expect(uploadedLink).toHaveAttribute('href', assetPath);
});

test('drives the synthetic slash-date lifecycle through mouse, keyboard, month navigation, and Escape', async ({
  page,
}) => {
  await page.clock.setFixedTime(FIXED_CALENDAR_DATE);
  const nextDay = new Date(2028, 11, 16);
  const nextMonthDay = new Date(2029, 0, 10);
  const note = await seedBrowserWorkspaceAndNote(page, {
    noteName: 'Slash dates',
    workspaceName: 'slash-command-date-lifecycle',
  });
  const editor = getEditorLocator(page, {});
  const calendar = page.locator('[data-slot="calendar"]');

  const openSlashDate = async () => {
    await page.keyboard.insertText('/');
    const dateItem = page
      .getByTestId('slash-command-menu')
      .getByRole('option', { name: /^Date Pick a date/ });
    await expect(dateItem).toBeVisible();
    await dateItem.click();
    await expect(calendar).toBeVisible();
  };

  await editor.click();
  await waitForEditorFocus(page, {});
  await openSlashDate();
  await expect(page.locator(daySelector(FIXED_CALENDAR_DATE))).toBeFocused();
  await page.locator(daySelector(FIXED_CALENDAR_DATE)).click();
  await expect(editor).toBeFocused();

  await page.keyboard.insertText(' ');
  await openSlashDate();
  await page.keyboard.press('ArrowRight');
  await page.keyboard.press('Enter');
  await expect(editor).toBeFocused();

  await page.keyboard.insertText(' ');
  await openSlashDate();
  await page.getByRole('button', { name: /next month/i }).click();
  await page.locator(daySelector(nextMonthDay)).click();
  await expect(editor).toBeFocused();

  await page.keyboard.insertText(' ');
  await openSlashDate();
  await page.getByRole('button', { name: /next month/i }).click();
  await page.keyboard.press('Escape');
  await expect(calendar).toBeHidden();
  await expect(editor).toBeFocused();
  await page.keyboard.insertText('After Escape');

  const expected = [
    formatDateLabel(FIXED_CALENDAR_DATE),
    formatDateLabel(nextDay),
    formatDateLabel(nextMonthDay),
    'After Escape',
  ].join(' ');
  await expect.poll(() => readSeededBrowserNote(page, note)).toBe(expected);
});

test('keeps direct $date data safe for selection, literal suffixes, and abandonment', async ({
  page,
}) => {
  await page.clock.setFixedTime(FIXED_CALENDAR_DATE);
  const dateLabel = formatDateLabel(FIXED_CALENDAR_DATE);
  const note = await seedBrowserWorkspaceAndNote(page, {
    noteName: 'Direct date',
    workspaceName: 'date-trigger-data-safety',
  });
  const editor = getEditorLocator(page, {});
  const calendar = page.locator('[data-slot="calendar"]');

  await editor.click();
  await waitForEditorFocus(page, {});
  await editor.pressSequentially('$date');
  await expect(calendar).toBeVisible();
  await page.locator(daySelector(FIXED_CALENDAR_DATE)).click();
  await expect(editor).toBeFocused();
  await expect.poll(() => readSeededBrowserNote(page, note)).toBe(dateLabel);

  await page.keyboard.press('ControlOrMeta+a');
  await page.keyboard.press('Backspace');
  await editor.pressSequentially('$datefoo');
  await expect(calendar).toBeHidden();
  await expect(editor).toHaveText('$datefoo');
  await expect.poll(() => readSeededBrowserNote(page, note)).toBe('$datefoo');

  await page.keyboard.press('ControlOrMeta+a');
  await page.keyboard.press('Backspace');
  await editor.pressSequentially('note $date');
  await expect(calendar).toBeVisible();
  await expect.poll(() => readSeededBrowserNote(page, note)).toBe('note $date');

  await page.reload({ waitUntil: 'domcontentloaded' });
  await waitForSeededBrowserNote(page, note);
  await expect(editor).toContainText('note $date');
  await expect(calendar).toBeHidden();
  await expect.poll(() => readSeededBrowserNote(page, note)).toBe('note $date');
});
