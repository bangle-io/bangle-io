import { expect, test } from '@playwright/test';
import {
  collapseEditorSelection,
  createBrowserWorkspaceAndNote,
  getEditorLocator,
  readStoredMarkdown,
  selectEditorText,
  waitForEditorFocus,
  writeStoredMarkdown,
} from './common';

test('tight and loose lists survive editing, task toggling, and reload', async ({
  page,
}) => {
  const workspaceName = 'list-markdown-fidelity';
  const noteName = 'lists';
  await createBrowserWorkspaceAndNote(page, { workspaceName, noteName });

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
  await writeStoredMarkdown(page, workspaceName, noteName, source);
  await page.reload({ waitUntil: 'networkidle' });

  const editor = getEditorLocator(page, {});
  await expect(editor.getByText('tight alpha', { exact: true })).toBeVisible();
  await expect(editor.getByText('loose beta', { exact: true })).toBeVisible();
  const checkbox = editor.getByRole('checkbox');
  await expect(checkbox).not.toBeChecked();

  await editor.getByText('tight alpha', { exact: true }).click();
  await waitForEditorFocus(page, {});
  await page.keyboard.press('End');
  await page.keyboard.insertText(' edited');

  await editor.getByText('loose beta', { exact: true }).click();
  await page.keyboard.press('End');
  await page.keyboard.insertText(' edited');
  await checkbox.click();
  await expect(checkbox).toBeChecked();

  const expected = source
    .replace('tight alpha', 'tight alpha edited')
    .replace('loose beta', 'loose beta edited')
    .replace('1. [ ] ordered task', '1. [x] ordered task');
  await expect
    .poll(() => readStoredMarkdown(page, workspaceName, noteName))
    .toBe(expected);

  await page.reload({ waitUntil: 'networkidle' });
  await expect(
    editor.getByText('tight alpha edited', { exact: true }),
  ).toBeVisible();
  await expect(
    editor.getByText('loose beta edited', { exact: true }),
  ).toBeVisible();
  await expect(editor.getByRole('checkbox')).toBeChecked();
  await expect
    .poll(() => readStoredMarkdown(page, workspaceName, noteName))
    .toBe(expected);
});

test('copy and paste preserves a loose ordered task list', async ({
  context,
  page,
}) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write']);
  const workspaceName = 'list-clipboard-fidelity';
  const noteName = 'ordered-tasks';
  const source = '1. [x] copied task\n\n1. [ ] copied pending';
  await createBrowserWorkspaceAndNote(page, { workspaceName, noteName });
  await writeStoredMarkdown(page, workspaceName, noteName, source);
  await page.reload({ waitUntil: 'networkidle' });

  const editor = getEditorLocator(page, {});
  await editor.click();
  await page.keyboard.press('ControlOrMeta+a');
  await page.keyboard.press('ControlOrMeta+c');
  await page.keyboard.press('Backspace');
  await expect
    .poll(() => readStoredMarkdown(page, workspaceName, noteName))
    .toBe('');
  await page.keyboard.press('ControlOrMeta+v');

  await expect(editor.getByText('copied task', { exact: true })).toBeVisible();
  await expect(
    editor.getByText('copied pending', { exact: true }),
  ).toBeVisible();
  await expect(editor.getByRole('checkbox').first()).toBeChecked();
  await expect(editor.getByRole('checkbox').last()).not.toBeChecked();
  await expect
    .poll(() => readStoredMarkdown(page, workspaceName, noteName))
    .toBe(source);

  await page.reload({ waitUntil: 'networkidle' });
  await expect(editor.getByRole('checkbox').first()).toBeChecked();
  await expect(editor.getByRole('checkbox').last()).not.toBeChecked();
  await expect(readStoredMarkdown(page, workspaceName, noteName)).resolves.toBe(
    source,
  );
});

test('Enter at the start of a loose ordered task preserves the list on reload', async ({
  page,
}) => {
  const workspaceName = 'list-enter-fidelity';
  const noteName = 'ordered-task-split';
  const source = '1. [x] ordered task\n\n1. [ ] sibling task';
  const expected = '1. [ ] \n\n1. [x] ordered task\n\n1. [ ] sibling task';
  await createBrowserWorkspaceAndNote(page, { workspaceName, noteName });
  await writeStoredMarkdown(page, workspaceName, noteName, source);
  await page.reload({ waitUntil: 'networkidle' });

  const editor = getEditorLocator(page, {});
  await expect(editor.getByText('ordered task', { exact: true })).toBeVisible();
  await collapseEditorSelection(page, 0);
  await page.keyboard.press('Enter');

  await expect(editor.getByRole('checkbox')).toHaveCount(3);
  await expect(editor.getByRole('checkbox').nth(0)).not.toBeChecked();
  await expect(editor.getByRole('checkbox').nth(1)).toBeChecked();
  await expect(editor.getByRole('checkbox').nth(2)).not.toBeChecked();
  await expect
    .poll(() => readStoredMarkdown(page, workspaceName, noteName))
    .toBe(expected);

  await page.reload({ waitUntil: 'networkidle' });
  await expect(editor.getByRole('checkbox')).toHaveCount(3);
  await expect(editor.getByRole('checkbox').nth(1)).toBeChecked();
  await expect(readStoredMarkdown(page, workspaceName, noteName)).resolves.toBe(
    expected,
  );
});

test('converting an ordered list to tasks keeps its container and looseness', async ({
  page,
}) => {
  const workspaceName = 'list-command-fidelity';
  const noteName = 'ordered-to-task';
  const source = '1. ordered one\n\n1. ordered two';
  const expected = '1. [ ] ordered one\n\n1. [ ] ordered two';
  await createBrowserWorkspaceAndNote(page, { workspaceName, noteName });
  await writeStoredMarkdown(page, workspaceName, noteName, source);
  await page.reload({ waitUntil: 'networkidle' });

  const editor = getEditorLocator(page, {});
  await editor.getByText('ordered one', { exact: true }).click();
  await waitForEditorFocus(page, {});
  await page.keyboard.press('ControlOrMeta+a');
  await page.keyboard.press('ControlOrMeta+Shift+7');

  await expect(editor.getByRole('checkbox')).toHaveCount(2);
  await expect
    .poll(() => readStoredMarkdown(page, workspaceName, noteName))
    .toBe(expected);

  await page.reload({ waitUntil: 'networkidle' });
  await expect(editor.getByRole('checkbox')).toHaveCount(2);
  await expect(readStoredMarkdown(page, workspaceName, noteName)).resolves.toBe(
    expected,
  );

  await editor.click();
  await page.keyboard.press('ControlOrMeta+a');
  await page.keyboard.press('Backspace');
  await page.keyboard.type('1. typed ordered');
  await page.keyboard.press('ControlOrMeta+Shift+7');
  const inputRuleExpected = '1. [ ] typed ordered';
  await expect(editor.getByRole('checkbox')).toHaveCount(1);
  await expect
    .poll(() => readStoredMarkdown(page, workspaceName, noteName))
    .toBe(inputRuleExpected);

  await page.reload({ waitUntil: 'networkidle' });
  await expect(editor.getByRole('checkbox')).toHaveCount(1);
  await expect(readStoredMarkdown(page, workspaceName, noteName)).resolves.toBe(
    inputRuleExpected,
  );
});

test('typing a bullet marker inside an ordered item persists as a bullet', async ({
  page,
}) => {
  const workspaceName = 'list-input-rule-fidelity';
  const noteName = 'ordered-to-bullet';
  await createBrowserWorkspaceAndNote(page, { workspaceName, noteName });

  const editor = getEditorLocator(page, {});
  await editor.click();
  await waitForEditorFocus(page, {});
  await page.keyboard.type('1. temporary');
  await expect
    .poll(() => readStoredMarkdown(page, workspaceName, noteName))
    .toBe('1. temporary');

  await selectEditorText(page, 'temporary');
  await page.keyboard.press('Backspace');
  await page.keyboard.type('- converted');

  await expect(editor.getByText('converted', { exact: true })).toBeVisible();
  await expect
    .poll(() => readStoredMarkdown(page, workspaceName, noteName))
    .toBe('- converted');

  await page.reload({ waitUntil: 'networkidle' });
  await expect(editor.getByText('converted', { exact: true })).toBeVisible();
  await expect(readStoredMarkdown(page, workspaceName, noteName)).resolves.toBe(
    '- converted',
  );
});
