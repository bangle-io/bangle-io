import { expect, test } from '@playwright/test';
import {
  collapseEditorSelectionAfterText,
  createBrowserWorkspaceAndNote,
  getEditorLocator,
  isDarwin,
  readStoredMarkdown,
  waitForEditorFocus,
  writeStoredMarkdown,
} from './common';

// Pin the browser locale so `data-day` (written with the browser's default
// `toLocaleDateString()`) is deterministic and matches the `'en-US'` selectors
// below regardless of the host/CI locale.
test.use({ locale: 'en-US' });

const FIXED_CALENDAR_DATE = new Date('2028-12-15T12:00:00');

test('option backspace deletes a slash query after Escape', async ({
  page,
}) => {
  test.skip(!isDarwin, 'Option+Backspace is a macOS word-delete shortcut');

  const workspaceName = 'slash-command-option-backspace';
  await createBrowserWorkspaceAndNote(page, {
    workspaceName,
    noteName: 'Home',
  });

  const editor = getEditorLocator(page, {});
  await editor.click();
  await waitForEditorFocus(page, {});
  await page.keyboard.insertText('/');
  await expect(page.getByTestId('slash-command-menu')).toBeVisible();
  await page.keyboard.insertText('////');

  await page.keyboard.press('Escape');
  await expect(page.getByTestId('slash-command-menu')).toBeHidden();
  await page.keyboard.down('Alt');
  await page.keyboard.press('Backspace');
  await page.keyboard.up('Alt');

  await expect(editor.locator('p')).toHaveCount(1);
  await expect
    .poll(() => readStoredMarkdown(page, workspaceName, 'Home'))
    .toBe('');
});

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

test('slash menu inside a table offers table operations instead of block transforms', async ({
  page,
}) => {
  const workspaceName = 'slash-command-table-context';
  await createBrowserWorkspaceAndNote(page, {
    workspaceName,
    noteName: 'Home',
  });
  await writeStoredMarkdown(
    page,
    workspaceName,
    'Home',
    '| a | b |\n| --- | --- |\n| 1 | 2 |',
  );
  await page.reload({ waitUntil: 'networkidle' });

  const editor = getEditorLocator(page, {});
  await expect(editor.locator('table')).toBeVisible();

  // Range-based caret placement: visual-line keys (Home/End) race
  // ProseMirror's state reconciliation. The leading space provides the
  // trigger boundary the slash input rule requires mid-text.
  await collapseEditorSelectionAfterText(page, '1');
  await page.keyboard.insertText(' /');

  const menu = page.getByTestId('slash-command-menu');
  await expect(menu).toBeVisible();

  // Block transforms don't apply inside inline-content cells.
  await expect(menu.getByText('Table', { exact: true })).toBeVisible();
  await expect(menu.getByText('Heading 1')).toBeHidden();
  await expect(menu.getByText('Code block')).toBeHidden();
  await expect(menu.getByText('Bullet list')).toBeHidden();
  // Inline text inserts still apply.
  await expect(menu.getByText('Today', { exact: true })).toBeVisible();
  // In a body row every structural action is available.
  await expect(menu.getByText('Add row above')).toBeVisible();

  await menu.getByText('Add row below').click();

  await expect(editor.locator('table tr')).toHaveCount(3);
  await expect
    .poll(async () => {
      const markdown = await readStoredMarkdown(page, workspaceName, 'Home');
      return markdown?.split('\n').filter((line) => line.startsWith('|'))
        .length;
    })
    .toBe(4);

  // In the header row "Add row above" is impossible (the command refuses),
  // so the shared availability gating must hide it here.
  await collapseEditorSelectionAfterText(page, 'a');
  await page.keyboard.insertText(' /');
  await expect(menu).toBeVisible();
  await expect(menu.getByText('Add row below')).toBeVisible();
  await expect(menu.getByText('Add row above')).toBeHidden();
});

test('a space ends the slash query but keeps the typed text', async ({
  page,
}) => {
  const workspaceName = 'slash-command-space-ends';
  await createBrowserWorkspaceAndNote(page, {
    workspaceName,
    noteName: 'Home',
  });

  const editor = getEditorLocator(page, {});
  await editor.click();
  await waitForEditorFocus(page, {});
  await page.keyboard.insertText('/');

  const menu = page.getByTestId('slash-command-menu');
  await expect(menu).toBeVisible();

  await page.keyboard.insertText(' ');
  await expect(menu).toBeHidden();

  // The typed characters stay ordinary text and editing continues.
  await page.keyboard.insertText('after');
  await expect
    .poll(() => readStoredMarkdown(page, workspaceName, 'Home'))
    .toBe('/ after');
});

test('clicking the Date item without filtering opens the calendar', async ({
  page,
}) => {
  await createBrowserWorkspaceAndNote(page, {
    workspaceName: 'slash-command-date-click',
    noteName: 'Home',
  });

  const editor = getEditorLocator(page, {});
  await editor.click();
  await waitForEditorFocus(page, {});
  await page.keyboard.insertText('/');

  const menu = page.getByTestId('slash-command-menu');
  await expect(menu).toBeVisible();
  await menu.getByText('Date', { exact: true }).click();

  await expect(page.locator('[data-slot="calendar"]')).toBeVisible();
});

test('selecting a slash item with the mouse keeps typing in the editor', async ({
  page,
}) => {
  const workspaceName = 'slash-command-mouse-focus';
  await createBrowserWorkspaceAndNote(page, {
    workspaceName,
    noteName: 'Home',
  });

  const editor = getEditorLocator(page, {});
  await editor.click();
  await waitForEditorFocus(page, {});
  await page.keyboard.insertText('/');

  const menu = page.getByTestId('slash-command-menu');
  await expect(menu).toBeVisible();
  await menu.getByText('Code block').click();

  await expect(editor.locator('pre')).toBeVisible();
  // The click must not steal focus from the editor: typing continues in the
  // freshly inserted block without clicking back into the editor.
  await expect(editor).toBeFocused();
  await page.keyboard.insertText('typed after mouse click');
  await expect(editor.locator('pre code')).toContainText(
    'typed after mouse click',
  );
});

test('typing a query ranks direct matches above fuzzy ones', async ({
  page,
}) => {
  await createBrowserWorkspaceAndNote(page, {
    workspaceName: 'slash-command-ranking',
    noteName: 'Home',
  });

  const editor = getEditorLocator(page, {});
  await editor.click();
  await waitForEditorFocus(page, {});
  await page.keyboard.insertText('/');
  const menu = page.getByTestId('slash-command-menu');
  await expect(menu).toBeVisible();

  await page.keyboard.insertText('date');
  const selected = menu.locator('[cmdk-item][data-selected="true"]');
  await expect(selected).toContainText('Date');
  // Fuzzy noise like "Heading 1" must not outrank or accompany the match.
  await expect(menu.getByText('Heading 1')).toBeHidden();
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

test('slash command uploads a file that persists after reload', async ({
  page,
}) => {
  const workspaceName = 'slash-command-upload-file';
  const noteName = 'Home';
  await createBrowserWorkspaceAndNote(page, { workspaceName, noteName });

  const editor = getEditorLocator(page, {});
  await editor.click();
  await waitForEditorFocus(page, {});
  await page.keyboard.insertText('/');
  await expect(page.getByTestId('slash-command-menu')).toBeVisible();
  await page.keyboard.insertText('upload');

  const fileChooserPromise = page.waitForEvent('filechooser');
  await page.getByTestId('slash-command-menu').getByText('Upload file').click();
  const fileChooser = await fileChooserPromise;
  await fileChooser.setFiles({
    name: 'Slash Upload.pdf',
    mimeType: 'application/pdf',
    buffer: Buffer.from('%PDF-1.4\n'),
  });

  await expect
    .poll(() => readStoredMarkdown(page, workspaceName, noteName))
    .toMatch(/^\[Slash Upload\.pdf\]\(assets\/slash-upload-.*\.pdf\)$/);

  await page.reload({ waitUntil: 'networkidle' });
  await expect(
    editor.getByRole('link', { name: 'Slash Upload.pdf' }),
  ).toBeVisible();
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
  // Today is initially selected. Clicking it must commit instead of toggling
  // the selection off and leaving the trigger text behind.
  await page.clock.setFixedTime(FIXED_CALENDAR_DATE);
  const target = FIXED_CALENDAR_DATE;
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

test('slash date command supports keyboard day navigation', async ({
  page,
}) => {
  const workspaceName = 'slash-command-date-keyboard';
  await page.clock.setFixedTime(FIXED_CALENDAR_DATE);
  const target = new Date(
    FIXED_CALENDAR_DATE.getFullYear(),
    FIXED_CALENDAR_DATE.getMonth(),
    FIXED_CALENDAR_DATE.getDate() + 1,
  );
  const targetLabel = formatDateLabel(target);

  await createBrowserWorkspaceAndNote(page, {
    workspaceName,
    noteName: 'Home',
  });

  const editor = getEditorLocator(page, {});
  await editor.click();
  await waitForEditorFocus(page, {});
  await page.keyboard.insertText('/');
  await expect(page.getByText('Date', { exact: true })).toBeVisible();
  await page.keyboard.insertText('date');
  await page.keyboard.press('Enter');

  await expect(page.locator('[data-slot="calendar"]')).toBeVisible();
  await expect(page.locator(daySelector(FIXED_CALENDAR_DATE))).toBeFocused();
  await page.keyboard.press('ArrowRight');
  await page.keyboard.press('Enter');

  await expect(editor).toBeFocused();
  await expect
    .poll(() => readStoredMarkdown(page, workspaceName, 'Home'))
    .toBe(targetLabel);
});

test('slash date command inserts a day after navigating months', async ({
  page,
}) => {
  const workspaceName = 'slash-command-date-nav';
  await page.clock.setFixedTime(FIXED_CALENDAR_DATE);
  const now = FIXED_CALENDAR_DATE;
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
  await page.clock.setFixedTime(FIXED_CALENDAR_DATE);
  const target = FIXED_CALENDAR_DATE;
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

test('typing after the $date trigger keeps every character in the note', async ({
  page,
}) => {
  const workspaceName = 'date-trigger-literal-text';
  await createBrowserWorkspaceAndNote(page, {
    workspaceName,
    noteName: 'Home',
  });

  const editor = getEditorLocator(page, {});
  await editor.click();
  await waitForEditorFocus(page, {});
  await editor.pressSequentially('$datefoo', { delay: 100 });

  await expect(page.locator('[data-slot="calendar"]')).toBeHidden();
  await waitForEditorFocus(page, {});
  await expect(editor).toHaveText('$datefoo');
  await expect
    .poll(() => readStoredMarkdown(page, workspaceName, 'Home'))
    .toBe('$datefoo');
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
