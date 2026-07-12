import { expect, test } from '@playwright/test';
import {
  createBrowserWorkspaceAndNote,
  getEditorLocator,
  readStoredMarkdown,
  waitForEditorFocus,
} from './common';

// Pin the browser locale so `data-day` (written with the browser's default
// `toLocaleDateString()`) is deterministic and matches the `'en-US'` selectors
// below regardless of the host/CI locale.
test.use({ locale: 'en-US' });

test('slash command stays active with multiple suggestion providers registered', async ({
  page,
}) => {
  const workspaceName = 'slash-command-suggestions';
  await createBrowserWorkspaceAndNote(page, {
    workspaceName,
    noteName: 'Home',
  });

  const editor = getEditorLocator(page, {});
  await editor.click();
  await waitForEditorFocus(page, {});
  await page.keyboard.insertText('/');

  await expect(page.getByText('Heading 1')).toBeVisible();
  await page.getByText('Heading 1').click();
  await page.keyboard.insertText('Slash Title');

  await expect(
    editor.getByRole('heading', { name: 'Slash Title', level: 1 }),
  ).toBeVisible();
  await expect
    .poll(() => readStoredMarkdown(page, workspaceName, 'Home'))
    .toBe('# Slash Title');
});

test('slash menu shows grouped items with icons and filters as you type', async ({
  page,
}) => {
  await createBrowserWorkspaceAndNote(page, {
    workspaceName: 'slash-command-menu-structure',
    noteName: 'Home',
  });

  const editor = getEditorLocator(page, {});
  await editor.click();
  await waitForEditorFocus(page, {});
  await page.keyboard.insertText('/');

  const menu = page.getByTestId('slash-command-menu');
  await expect(menu).toBeVisible();
  await expect(menu.getByText('Basic blocks')).toBeVisible();
  await expect(menu.getByText('Lists', { exact: true })).toBeVisible();
  await expect(menu.getByText('Time', { exact: true })).toBeVisible();

  // Items render as icon + title + description rows.
  const headingItem = menu.getByRole('option', { name: /Heading 1/ });
  await expect(headingItem).toBeVisible();
  await expect(headingItem.locator('svg')).toBeVisible();
  await expect(headingItem.getByText('Large section heading')).toBeVisible();

  // Typing narrows the menu, including alias matches.
  await page.keyboard.insertText('head');
  await expect(menu.getByText('Heading 1')).toBeVisible();
  await expect(menu.getByText('Bullet list')).toBeHidden();

  // A query with no matches shows the empty state.
  await page.keyboard.insertText('zzzz');
  await expect(menu.getByText('No results')).toBeVisible();
});

test('slash command can insert a persisted code block', async ({ page }) => {
  const workspaceName = 'slash-command-code-block';
  await createBrowserWorkspaceAndNote(page, {
    workspaceName,
    noteName: 'Home',
  });

  const editor = getEditorLocator(page, {});
  await editor.click();
  await waitForEditorFocus(page, {});
  await page.keyboard.insertText('/');
  await expect(page.getByText('Code block')).toBeVisible();
  await page.keyboard.insertText('code');

  const codeBlockCommand = page.getByText('Code block');
  await expect(codeBlockCommand).toBeVisible();
  await codeBlockCommand.click();
  await page.keyboard.insertText('const viaSlash = true;');

  await expect(editor.locator('pre code')).toContainText(
    'const viaSlash = true;',
  );
  await expect
    .poll(() => readStoredMarkdown(page, workspaceName, 'Home'))
    .toBe('```\nconst viaSlash = true;\n```');
});

// Matches the date-fns `PP` format used by the slash command
// (e.g. "Dec 15, 2028").
function formatDateLabel(date: Date): string {
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(date);
}

// `data-day` is a stable contract set by our CalendarDayButton wrapper; it lets
// us target a specific day without depending on react-day-picker's localized
// aria labels, and disambiguates from same-numbered days of adjacent months.
function daySelector(date: Date): string {
  return `[data-day="${date.toLocaleDateString('en-US')}"]`;
}

test('slash date command inserts a day picked from the current month', async ({
  page,
}) => {
  const workspaceName = 'slash-command-date-picker';
  // The 15th always exists and needs no navigation, keeping the assertion
  // deterministic regardless of when the suite runs.
  const now = new Date();
  const target = new Date(now.getFullYear(), now.getMonth(), 15);
  const targetLabel = formatDateLabel(target);

  await createBrowserWorkspaceAndNote(page, {
    workspaceName,
    noteName: 'Home',
  });

  const editor = getEditorLocator(page, {});
  await editor.click();
  await waitForEditorFocus(page, {});
  await page.keyboard.insertText('/');
  // Let the suggestion menu open before narrowing it; typing the query in the
  // same tick as '/' races the mark creation and can drop the input.
  await expect(page.getByText('Date', { exact: true })).toBeVisible();
  await page.keyboard.insertText('date');

  const dateCommand = page.getByText('Date', { exact: true });
  await expect(dateCommand).toBeVisible();
  await dateCommand.click();

  await expect(page.locator('[data-slot="calendar"]')).toBeVisible();
  await page.locator(daySelector(target)).click();

  await expect(editor).toContainText(targetLabel);
  await expect
    .poll(() => readStoredMarkdown(page, workspaceName, 'Home'))
    .toBe(targetLabel);

  // Selecting a day must return focus to the editor and continue typing right
  // after the inserted date (guards the post-insert focus handoff).
  await expect(editor).toBeFocused();
  await page.keyboard.insertText(' meeting');
  await expect
    .poll(() => readStoredMarkdown(page, workspaceName, 'Home'))
    .toBe(`${targetLabel} meeting`);
});

test('slash date command inserts a day after navigating months', async ({
  page,
}) => {
  const workspaceName = 'slash-command-date-nav';
  const now = new Date();
  // Constructing from month + 1 naturally rolls over year boundaries.
  const target = new Date(now.getFullYear(), now.getMonth() + 1, 10);
  const targetLabel = formatDateLabel(target);

  await createBrowserWorkspaceAndNote(page, {
    workspaceName,
    noteName: 'Home',
  });

  const editor = getEditorLocator(page, {});
  await editor.click();
  await waitForEditorFocus(page, {});
  await page.keyboard.insertText('/');
  // Let the suggestion menu open before narrowing it; typing the query in the
  // same tick as '/' races the mark creation and can drop the input.
  await expect(page.getByText('Date', { exact: true })).toBeVisible();
  await page.keyboard.insertText('date');

  await page.getByText('Date', { exact: true }).click();
  await expect(page.locator('[data-slot="calendar"]')).toBeVisible();

  // Advance one month using the calendar's built-in navigation.
  await page.getByRole('button', { name: /next month/i }).click();
  await page.locator(daySelector(target)).click();

  await expect(editor).toContainText(targetLabel);
  await expect
    .poll(() => readStoredMarkdown(page, workspaceName, 'Home'))
    .toBe(targetLabel);
});

test('typing the $date trigger directly opens the calendar and inserts a day', async ({
  page,
}) => {
  const workspaceName = 'date-trigger-direct';
  const now = new Date();
  const target = new Date(now.getFullYear(), now.getMonth(), 15);
  const targetLabel = formatDateLabel(target);

  await createBrowserWorkspaceAndNote(page, {
    workspaceName,
    noteName: 'Home',
  });

  const editor = getEditorLocator(page, {});
  await editor.click();
  await waitForEditorFocus(page, {});
  await page.keyboard.insertText('$date');

  await expect(page.locator('[data-slot="calendar"]')).toBeVisible();
  await page.locator(daySelector(target)).click();

  await expect(editor).toContainText(targetLabel);
  await expect
    .poll(() => readStoredMarkdown(page, workspaceName, 'Home'))
    .toBe(targetLabel);
});

test('an abandoned $date trigger persists as plain text across reload', async ({
  page,
}) => {
  const workspaceName = 'date-trigger-abandoned';
  await createBrowserWorkspaceAndNote(page, {
    workspaceName,
    noteName: 'Home',
  });

  const editor = getEditorLocator(page, {});
  await editor.click();
  await waitForEditorFocus(page, {});
  await page.keyboard.insertText('note ');
  await page.keyboard.insertText('$date');

  const calendar = page.locator('[data-slot="calendar"]');
  await expect(calendar).toBeVisible();

  // The suggestion mark serializes to nothing; an abandoned trigger stays in
  // the note as plain text — same contract as an abandoned `[[` wiki trigger.
  await expect
    .poll(() => readStoredMarkdown(page, workspaceName, 'Home'))
    .toBe('note $date');

  await page.reload();
  const reloadedEditor = getEditorLocator(page, {});
  await expect(reloadedEditor).toContainText('note $date');
  await expect(page.locator('[data-slot="calendar"]')).toBeHidden();
});

test('slash date command dismisses with Escape after calendar interaction', async ({
  page,
}) => {
  const workspaceName = 'slash-command-date-dismiss';
  await createBrowserWorkspaceAndNote(page, {
    workspaceName,
    noteName: 'Home',
  });

  const editor = getEditorLocator(page, {});
  await editor.click();
  await waitForEditorFocus(page, {});
  await page.keyboard.insertText('/');
  // Let the suggestion menu open before narrowing it; typing the query in the
  // same tick as '/' races the mark creation and can drop the input.
  await expect(page.getByText('Date', { exact: true })).toBeVisible();
  await page.keyboard.insertText('date');

  const dateCommand = page.getByText('Date', { exact: true });
  await expect(dateCommand).toBeVisible();
  await dateCommand.click();

  const calendar = page.locator('[data-slot="calendar"]');
  await expect(calendar).toBeVisible();
  await page.getByRole('button', { name: /next month/i }).click();
  await page.keyboard.press('Escape');

  await expect(calendar).toBeHidden();
  await editor.click();
  await page.keyboard.insertText('After Escape');
  await expect
    .poll(() => readStoredMarkdown(page, workspaceName, 'Home'))
    .toBe('After Escape');
});
