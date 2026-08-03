import { expect, test } from '@playwright/test';
import {
  collapseEditorSelectionAfterText,
  getEditorLocator,
  readSeededBrowserNote,
  seedBrowserWorkspaceAndNote,
  waitForEditorFocus,
  waitForSeededBrowserNote,
} from './common';

test('edits tight and loose lists, checks an ordered task, and reloads exact Markdown', async ({
  page,
}) => {
  const source = [
    '# List fidelity',
    '',
    '- tight alpha',
    '- tight beta',
    '',
    'Loose list:',
    '',
    '- loose alpha',
    '',
    '- loose beta',
    '',
    '1. [ ] ordered task',
  ].join('\n');
  const note = await seedBrowserWorkspaceAndNote(page, {
    initialMarkdown: source,
    noteName: 'List fidelity',
    workspaceName: 'list-markdown-fidelity',
  });
  const editor = getEditorLocator(page, {});

  await expect(editor.getByText('tight alpha', { exact: true })).toBeVisible();
  await expect(editor.getByText('loose beta', { exact: true })).toBeVisible();
  const checkbox = editor.getByRole('checkbox');
  await expect(checkbox).not.toBeChecked();

  await collapseEditorSelectionAfterText(page, 'tight alpha');
  await waitForEditorFocus(page, {});
  await page.keyboard.insertText(' edited');
  await collapseEditorSelectionAfterText(page, 'loose beta');
  await page.keyboard.insertText(' edited');
  await checkbox.click();

  const expected = source
    .replace('tight alpha', 'tight alpha edited')
    .replace('loose beta', 'loose beta edited')
    .replace('1. [ ] ordered task', '1. [x] ordered task');
  await expect.poll(() => readSeededBrowserNote(page, note)).toBe(expected);

  await page.reload({ waitUntil: 'domcontentloaded' });
  await waitForSeededBrowserNote(page, note);
  await expect(
    editor.getByText('tight alpha edited', { exact: true }),
  ).toBeVisible();
  await expect(
    editor.getByText('loose beta edited', { exact: true }),
  ).toBeVisible();
  await expect(editor.getByRole('checkbox')).toBeChecked();
  await expect.poll(() => readSeededBrowserNote(page, note)).toBe(expected);
});

test('natively copies, deletes, and pastes a loose ordered task list', async ({
  context,
  page,
}) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write']);
  const source = '1. [x] copied task\n\n1. [ ] copied pending';
  const note = await seedBrowserWorkspaceAndNote(page, {
    initialMarkdown: source,
    noteName: 'Ordered tasks',
    workspaceName: 'list-clipboard-fidelity',
  });
  const editor = getEditorLocator(page, {});

  await editor.click();
  await waitForEditorFocus(page, {});
  await page.keyboard.press('ControlOrMeta+a');
  await page.keyboard.press('ControlOrMeta+c');
  await expect
    .poll(() => page.evaluate(() => navigator.clipboard.readText()))
    .toMatch(/copied task\n\ncopied pending\s*$/);
  await page.keyboard.press('Backspace');
  await expect.poll(() => readSeededBrowserNote(page, note)).toBe('');
  await page.keyboard.press('ControlOrMeta+v');

  await expect(editor.getByText('copied task', { exact: true })).toBeVisible();
  await expect(
    editor.getByText('copied pending', { exact: true }),
  ).toBeVisible();
  await expect(editor.getByRole('checkbox').first()).toBeChecked();
  await expect(editor.getByRole('checkbox').last()).not.toBeChecked();
  await expect.poll(() => readSeededBrowserNote(page, note)).toBe(source);
});

test('converts one same-level run through slash and keyboard task actions', async ({
  page,
}) => {
  const source = '- alpha\n- beta\n- gamma';
  const note = await seedBrowserWorkspaceAndNote(page, {
    initialMarkdown: source,
    noteName: 'List runs',
    workspaceName: 'same-level-list-formatting',
  });
  const editor = getEditorLocator(page, {});
  const slashMenu = page.getByTestId('slash-command-menu');

  await collapseEditorSelectionAfterText(page, 'beta');
  await waitForEditorFocus(page, {});
  await page.keyboard.insertText(' /');
  await expect(slashMenu).toBeVisible();
  await slashMenu.getByRole('option', { name: 'Numbered list' }).click();
  await page.keyboard.press('Backspace');

  const ordered = '1. alpha\n1. beta\n1. gamma';
  await expect.poll(() => readSeededBrowserNote(page, note)).toBe(ordered);
  await expect(
    editor.locator(
      '.prosemirror-flat-list[data-list-container-kind="ordered"]',
    ),
  ).toHaveCount(3);

  await collapseEditorSelectionAfterText(page, 'beta');
  await waitForEditorFocus(page, {});
  await page.keyboard.press('ControlOrMeta+a');
  await page.keyboard.press('ControlOrMeta+Shift+7');

  const expected = '1. [ ] alpha\n1. [ ] beta\n1. [ ] gamma';
  await expect(editor.getByRole('checkbox')).toHaveCount(3);
  await expect.poll(() => readSeededBrowserNote(page, note)).toBe(expected);
});

test('indents a deep task, reloads it, and deterministically outdents it', async ({
  page,
}) => {
  const source = '- parent\n  - [ ] child';
  const indented = '- parent\n\n  - \n    - [ ] child';
  const outdented = '- parent\n\n  - [ ] child';
  const note = await seedBrowserWorkspaceAndNote(page, {
    initialMarkdown: source,
    noteName: 'Deep task indent',
    workspaceName: 'deep-task-indent-fidelity',
  });
  const editor = getEditorLocator(page, {});

  await expect(editor.getByText('child', { exact: true })).toBeVisible();
  await collapseEditorSelectionAfterText(page, 'child');
  await waitForEditorFocus(page, {});
  await page.keyboard.press('Tab');
  await expect(editor.getByRole('checkbox')).toHaveCount(1);
  await expect(editor.getByRole('checkbox')).not.toBeChecked();
  await expect.poll(() => readSeededBrowserNote(page, note)).toBe(indented);

  await page.reload({ waitUntil: 'domcontentloaded' });
  await waitForSeededBrowserNote(page, note);
  await expect(editor.getByText('child', { exact: true })).toBeVisible();
  await collapseEditorSelectionAfterText(page, 'child');
  await waitForEditorFocus(page, {});
  await page.keyboard.press('Shift+Tab');

  await expect.poll(() => readSeededBrowserNote(page, note)).toBe(outdented);
  await expect(editor.getByRole('checkbox')).toHaveCount(1);
  await expect(editor.getByRole('checkbox')).not.toBeChecked();
});

test('smoke-tests list shortcuts for insertion, unchecked task creation, and toggling', async ({
  page,
}) => {
  const source = '- alpha\n\n- beta\n\n- gamma\n\n- [x] done';
  const note = await seedBrowserWorkspaceAndNote(page, {
    initialMarkdown: source,
    noteName: 'List shortcuts',
    workspaceName: 'list-shortcuts',
  });
  const editor = getEditorLocator(page, {});

  await collapseEditorSelectionAfterText(page, 'beta');
  await waitForEditorFocus(page, {});
  await page.keyboard.press('ControlOrMeta+Enter');
  await page.keyboard.insertText('delta');
  const withBelow = '- alpha\n\n- beta\n\n- delta\n\n- gamma\n\n- [x] done';
  await expect.poll(() => readSeededBrowserNote(page, note)).toBe(withBelow);

  await collapseEditorSelectionAfterText(page, 'alpha');
  await page.keyboard.press('ControlOrMeta+Shift+Enter');
  await page.keyboard.insertText('start');
  const withAbove =
    '- start\n\n- alpha\n\n- beta\n\n- delta\n\n- gamma\n\n- [x] done';
  await expect.poll(() => readSeededBrowserNote(page, note)).toBe(withAbove);

  await expect(editor.getByText('done', { exact: true })).toBeVisible();
  await collapseEditorSelectionAfterText(page, 'done');
  await page.keyboard.press('ControlOrMeta+Enter');
  await page.keyboard.insertText('todo');
  const withTask = `${withAbove}\n\n- [ ] todo`;
  await expect.poll(() => readSeededBrowserNote(page, note)).toBe(withTask);
  await expect(editor.getByRole('checkbox').first()).toBeChecked();
  await expect(editor.getByRole('checkbox').last()).not.toBeChecked();

  await collapseEditorSelectionAfterText(page, 'todo');
  await page.keyboard.press('Alt+Enter');
  const toggled = `${withAbove}\n\n- [x] todo`;
  await expect.poll(() => readSeededBrowserNote(page, note)).toBe(toggled);
  await expect(editor.getByRole('checkbox').first()).toBeChecked();
  await expect(editor.getByRole('checkbox').last()).toBeChecked();

  await page.keyboard.press('Alt+Enter');
  await expect.poll(() => readSeededBrowserNote(page, note)).toBe(withTask);
  await expect(editor.getByRole('checkbox').first()).toBeChecked();
  await expect(editor.getByRole('checkbox').last()).not.toBeChecked();
});
