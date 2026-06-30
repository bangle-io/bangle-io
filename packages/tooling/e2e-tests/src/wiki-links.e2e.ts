import { expect, type Page, test } from '@playwright/test';
import {
  clearEditor,
  collapseEditorSelection,
  createBrowserWorkspace,
  createBrowserWorkspaceAndNote,
  expectNoPageHorizontalOverflow,
  getEditorLocator,
  readStoredMarkdown,
  selectEditorText,
  waitForEditorFocus,
  writeStoredMarkdown,
} from './common';

async function writeManyStoredMarkdown(
  page: Page,
  workspaceName: string,
  files: Array<{ noteName: string; markdown: string }>,
) {
  await page.evaluate(
    async ({ workspace, entries }) => {
      const request = indexedDB.open('baby-idb-db-3');
      const database = await new Promise<IDBDatabase>((resolve, reject) => {
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      });
      await new Promise<void>((resolve, reject) => {
        const transaction = database.transaction(
          'baby-idb-db-store-3',
          'readwrite',
        );
        transaction.oncomplete = () => resolve();
        transaction.onerror = () => reject(transaction.error);
        transaction.onabort = () => reject(transaction.error);
        const store = transaction.objectStore('baby-idb-db-store-3');
        for (const entry of entries) {
          store.put(
            new File([entry.markdown], `${entry.noteName}.md`, {
              type: 'text/markdown',
            }),
            `${workspace}/${entry.noteName}.md`,
          );
        }
      });
      database.close();
    },
    { workspace: workspaceName, entries: files },
  );
}

test('authors, persists, reloads, and navigates wiki links safely', async ({
  page,
}) => {
  const workspaceName = 'wiki-links';
  await createBrowserWorkspaceAndNote(page, {
    workspaceName,
    noteName: 'Home',
  });
  await writeStoredMarkdown(page, workspaceName, 'Target', 'target content');
  await writeStoredMarkdown(page, workspaceName, 'folder/Duplicate', 'one');
  await writeStoredMarkdown(page, workspaceName, 'other/Duplicate', 'two');
  await page.reload({ waitUntil: 'networkidle' });

  const editor = getEditorLocator(page, {});
  await editor.click();
  await page.keyboard.insertText('Start ');
  await page.keyboard.insertText('[');
  await page.keyboard.insertText('[');
  const picker = page.getByRole('listbox', { name: 'Link to a note' });
  await expect(picker).toBeVisible();
  await page.keyboard.insertText('Tar');
  await expect(picker.getByRole('option', { name: 'Target' })).toBeVisible();
  await expect(
    picker.getByRole('option', { name: 'Link to “Tar”' }),
  ).toBeVisible();
  await page.keyboard.press('ArrowDown');
  await expect(
    picker.getByRole('option', { name: 'Link to “Tar”' }),
  ).toHaveAttribute('aria-selected', 'true');
  await page.keyboard.press('ArrowUp');
  await expect(picker.getByRole('option', { name: 'Target' })).toHaveAttribute(
    'aria-selected',
    'true',
  );
  await page.keyboard.press('Enter');

  const targetChip = editor.getByRole('link', { name: 'Target', exact: true });
  await expect(targetChip).toBeVisible();
  await page.keyboard.insertText(' and ');
  await page.keyboard.insertText('[');
  await page.keyboard.insertText('[');
  await page.keyboard.insertText('Duplicate');
  await expect(picker).toBeVisible();
  const folderDuplicate = picker
    .getByRole('option')
    .filter({ hasText: 'folder/' });
  await folderDuplicate.click();
  await expect(
    editor.getByRole('link', { name: 'Duplicate', exact: true }),
  ).toBeVisible();
  await page.keyboard.insertText(' after');
  await expect
    .poll(() => readStoredMarkdown(page, workspaceName, 'Home'))
    .toBe('Start [[Target]] and [[/folder/Duplicate]] after');

  await page.reload({ waitUntil: 'networkidle' });
  await expect(targetChip).toBeVisible();
  await targetChip.focus();
  await page.keyboard.press('Enter');
  await expect(editor).toContainText('target content');

  await writeStoredMarkdown(
    page,
    workspaceName,
    'Target',
    '[[Home|Go home]] and [[Missing]]',
  );
  await page.reload({ waitUntil: 'networkidle' });
  await expect(editor.getByRole('link', { name: 'Go home' })).toBeVisible();
  const missing = editor.getByRole('link', {
    name: 'Missing (note not found)',
  });
  await expect(missing).toBeVisible();
  await missing.click();
  await expect(page).toHaveURL(
    /ws#route=editor&wsPath=wiki-links%3AMissing\.md$/,
  );
  await expect(
    page.getByLabel('breadcrumb').getByRole('button', { name: 'Missing.md' }),
  ).toBeVisible();
  await expect
    .poll(() => readStoredMarkdown(page, workspaceName, 'Missing'))
    .toBe('');
  await expect
    .poll(() => readStoredMarkdown(page, workspaceName, 'Target'))
    .toBe('[[Home|Go home]] and [[Missing]]');
});

test('does not offer the note being edited as a wiki-link suggestion', async ({
  page,
}) => {
  const workspaceName = 'wiki-link-self-suggestion';
  await createBrowserWorkspaceAndNote(page, {
    workspaceName,
    noteName: 'Home',
  });
  await writeStoredMarkdown(page, workspaceName, 'Target', 'target content');
  await page.reload({ waitUntil: 'networkidle' });

  const editor = getEditorLocator(page, {});
  await editor.click();
  await page.keyboard.insertText('[');
  await page.keyboard.insertText('[');

  const picker = page.getByRole('listbox', { name: 'Link to a note' });
  await expect(picker).toBeVisible();
  await expect(
    picker.getByRole('option', { name: 'Target', exact: true }),
  ).toBeVisible();
  await expect(
    picker.getByRole('option', { name: 'Home', exact: true }),
  ).toHaveCount(0);
});

test('shows exact linked mentions for the active note', async ({ page }) => {
  const workspaceName = 'linked-mentions';
  await createBrowserWorkspaceAndNote(page, {
    workspaceName,
    noteName: 'Target',
  });
  await writeStoredMarkdown(
    page,
    workspaceName,
    'Target',
    `Target content ${'x'.repeat(240)}`,
  );
  await writeStoredMarkdown(
    page,
    workspaceName,
    'SourceWiki',
    'See [[Target]]',
  );
  await writeStoredMarkdown(
    page,
    workspaceName,
    'SourceMarkdown',
    'See [Target](Target.md)',
  );
  await writeStoredMarkdown(
    page,
    workspaceName,
    'PlainMention',
    'Target appears as plain text.',
  );
  await writeStoredMarkdown(
    page,
    workspaceName,
    'IgnoredSyntax',
    '`[[Target]]`\n\n```md\n[[Target]]\n```\n\n![[Target]]\n\n![Target](Target.md)',
  );
  await writeStoredMarkdown(
    page,
    workspaceName,
    'EscapedMarkdown',
    String.raw`See \[Target](Target.md) as plain text.`,
  );
  await writeStoredMarkdown(
    page,
    workspaceName,
    'MarkdownLinkLabel',
    '[ordinary [[Target]]](https://example.com)',
  );
  await page.reload({ waitUntil: 'networkidle' });

  const linkedMentions = page.getByRole('region', {
    name: 'Linked mentions',
  });
  await expect(linkedMentions).toBeVisible();

  await page.getByRole('button', { name: 'Toggle Max Width' }).click();
  const editorBox = await getEditorLocator(page, {}).boundingBox();
  const editorPaddingLeft = await getEditorLocator(page, {}).evaluate(
    (element) => Number.parseFloat(getComputedStyle(element).paddingLeft),
  );
  const linkedMentionsControlBox = await linkedMentions
    .getByRole('button', { name: 'Collapse linked mentions' })
    .boundingBox();
  if (!editorBox || !linkedMentionsControlBox) {
    throw new Error('Unable to measure linked mentions layout');
  }
  expect(
    Math.abs(linkedMentionsControlBox.x - (editorBox.x + editorPaddingLeft)),
  ).toBeLessThanOrEqual(1);
  await expectNoPageHorizontalOverflow(page);

  await expect(
    linkedMentions.getByRole('link', { name: 'SourceWiki.md' }),
  ).toBeVisible();
  await expect(
    linkedMentions.getByRole('link', { name: 'SourceMarkdown.md' }),
  ).toBeVisible();
  await expect(
    linkedMentions.getByRole('link', { name: 'PlainMention.md' }),
  ).toHaveCount(0);
  await expect(
    linkedMentions.getByRole('link', { name: 'IgnoredSyntax.md' }),
  ).toHaveCount(0);
  await expect(
    linkedMentions.getByRole('link', { name: 'EscapedMarkdown.md' }),
  ).toHaveCount(0);
  await expect(
    linkedMentions.getByRole('link', { name: 'MarkdownLinkLabel.md' }),
  ).toHaveCount(0);

  await linkedMentions
    .getByRole('button', { name: 'Collapse linked mentions' })
    .click();
  await expect(
    linkedMentions.getByRole('button', { name: 'Expand linked mentions' }),
  ).toHaveAttribute('aria-expanded', 'false');
  await expect(
    linkedMentions.getByRole('link', { name: 'SourceWiki.md' }),
  ).toHaveCount(0);

  await page.reload({ waitUntil: 'networkidle' });
  const reloadedLinkedMentions = page.getByRole('region', {
    name: 'Linked mentions',
  });
  await expect(
    reloadedLinkedMentions.getByRole('button', {
      name: 'Expand linked mentions',
    }),
  ).toHaveAttribute('aria-expanded', 'false');
  await expect(
    reloadedLinkedMentions.getByRole('link', { name: 'SourceWiki.md' }),
  ).toHaveCount(0);

  await reloadedLinkedMentions
    .getByRole('button', { name: 'Expand linked mentions' })
    .click();
  await expect(
    reloadedLinkedMentions.getByRole('link', { name: 'SourceWiki.md' }),
  ).toBeVisible();

  await reloadedLinkedMentions
    .getByRole('link', { name: 'SourceWiki.md' })
    .click();
  await expect(page).toHaveURL(
    /ws#route=editor&wsPath=linked-mentions%3ASourceWiki\.md$/,
  );
  await expect(getEditorLocator(page, {})).toContainText('See');
});

test('renders resolved and unresolved wiki links with distinct dark-mode affordances', async ({
  page,
}) => {
  const workspaceName = 'wiki-link-dark-affordance';
  await createBrowserWorkspaceAndNote(page, {
    workspaceName,
    noteName: 'Home',
  });
  await writeStoredMarkdown(page, workspaceName, 'Target', 'target content');
  await writeStoredMarkdown(
    page,
    workspaceName,
    'Home',
    '[[Target]] and [[Missing]]',
  );
  await page.evaluate(() => localStorage.setItem('color-scheme', 'dark'));
  await page.reload({ waitUntil: 'networkidle' });
  await expect
    .poll(() =>
      page.evaluate(() =>
        document.documentElement.classList.contains('BU_dark-scheme'),
      ),
    )
    .toBe(true);

  const editor = getEditorLocator(page, {});
  const target = editor.getByRole('link', { name: 'Target', exact: true });
  const missing = editor.getByRole('link', {
    name: 'Missing (note not found)',
  });
  await expect(target).toBeVisible();
  await expect(missing).toBeVisible();

  const targetStyle = await target.evaluate((node) => {
    const style = getComputedStyle(node);
    return {
      borderWidth: style.borderWidth,
      color: style.color,
      textDecorationLine: style.textDecorationLine,
      textDecorationStyle: style.textDecorationStyle,
    };
  });
  const missingStyle = await missing.evaluate((node) => {
    const style = getComputedStyle(node);
    return {
      borderWidth: style.borderWidth,
      color: style.color,
      textDecorationLine: style.textDecorationLine,
      textDecorationStyle: style.textDecorationStyle,
    };
  });

  expect(targetStyle.color).not.toBe(missingStyle.color);
  expect(targetStyle.textDecorationLine).toContain('underline');
  expect(targetStyle.textDecorationStyle).toBe('solid');
  expect(targetStyle.borderWidth).toBe('0px');
  expect(missingStyle.textDecorationLine).toContain('underline');
  expect(missingStyle.textDecorationLine).not.toContain('line-through');
  expect(missingStyle.textDecorationStyle).toBe('dotted');
  expect(missingStyle.borderWidth).toBe('0px');
});

test('keeps escape, code, malformed, and ambiguous wiki text non-destructive', async ({
  page,
}) => {
  const workspaceName = 'wiki-link-literals';
  await createBrowserWorkspaceAndNote(page, {
    workspaceName,
    noteName: 'Home',
  });
  await writeStoredMarkdown(page, workspaceName, 'one/Same', 'one');
  await writeStoredMarkdown(page, workspaceName, 'two/Same', 'two');
  await page.reload({ waitUntil: 'networkidle' });

  const editor = getEditorLocator(page, {});
  await expect(editor).toBeVisible();
  await editor.click();
  await waitForEditorFocus(page, {});
  await page.keyboard.insertText('[');
  await page.keyboard.insertText('[');
  await expect(
    page.getByRole('listbox', { name: 'Link to a note' }),
  ).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(
    page.getByRole('listbox', { name: 'Link to a note' }),
  ).toBeHidden();
  await expect(editor).toContainText('[[');
  await page.keyboard.insertText('Missing');
  await page.keyboard.insertText(']');
  await page.keyboard.insertText(']');
  await expect(
    editor.getByRole('link', { name: 'Missing (note not found)' }),
  ).toBeVisible();
  await expect
    .poll(() => readStoredMarkdown(page, workspaceName, 'Home'))
    .toBe('[[Missing]]');

  await clearEditor(page, {});
  await page.keyboard.insertText('[');
  await page.keyboard.insertText('[');
  const picker = page.getByRole('listbox', { name: 'Link to a note' });
  await expect(picker).toBeVisible();
  await page.keyboard.insertText('foo|bar');
  await expect(
    picker.getByRole('option', { name: 'Link to “foo|bar”' }),
  ).toBeVisible();
  await page.keyboard.press('Enter');
  await expect(
    editor.getByRole('link', { name: 'bar (note not found)' }),
  ).toBeVisible();
  await expect
    .poll(() => readStoredMarkdown(page, workspaceName, 'Home'))
    .toBe('[[foo|bar]]');
  await page.reload({ waitUntil: 'networkidle' });
  await expect(
    editor.getByRole('link', { name: 'bar (note not found)' }),
  ).toBeVisible();

  await writeStoredMarkdown(
    page,
    workspaceName,
    'Home',
    '`[[inline]]`\n\n```md\n[[fenced]]\n```\n\n[[nested [[bad]]]]\n\n[[Same]]',
  );
  await page.reload({ waitUntil: 'networkidle' });
  await expect(editor.locator('code').first()).toHaveText('[[inline]]');
  await expect(editor.locator('pre')).toContainText('[[fenced]]');
  await expect(editor).toContainText('[[nested [[bad]]]]');
  await expect(
    editor.getByRole('link', { name: 'Same (note not found)' }),
  ).toBeVisible();
});

test('does not trigger wiki-link suggestions while typing inside a Markdown link', async ({
  page,
}) => {
  const workspaceName = 'wiki-link-inside-markdown-link';
  const noteName = 'Home';
  await createBrowserWorkspaceAndNote(page, { workspaceName, noteName });

  const editor = getEditorLocator(page, {});
  await editor.click();
  await waitForEditorFocus(page, {});
  await page.keyboard.insertText('visit example');
  await selectEditorText(page, 'example');
  await page.getByRole('button', { name: 'Link', exact: true }).click();
  const urlInput = page.getByRole('textbox', { name: 'Link URL' });
  await urlInput.fill('https://example.com');
  await urlInput.press('Enter');
  await expect
    .poll(() => readStoredMarkdown(page, workspaceName, noteName))
    .toBe('visit [example](https://example.com/)');

  await collapseEditorSelection(page, 9);
  await page.keyboard.insertText('[');
  await page.keyboard.insertText('[');

  await expect(
    page.getByRole('listbox', { name: 'Link to a note' }),
  ).toHaveCount(0);
  await expect(editor.getByRole('link', { name: 'exa[[mple' })).toBeVisible();
  await page.reload({ waitUntil: 'networkidle' });
  await expect(editor.getByRole('link', { name: 'exa[[mple' })).toBeVisible();
  await expect(
    page.getByRole('listbox', { name: 'Link to a note' }),
  ).toHaveCount(0);
});

test('keeps wiki syntax inside ordinary Markdown link text as plain link text', async ({
  page,
}) => {
  const workspaceName = 'wiki-text-in-markdown-link';
  const noteName = 'Home';
  const initialMarkdown = 'See [ordinary [[target]]](./target.md) after';
  await createBrowserWorkspaceAndNote(page, { workspaceName, noteName });
  await writeStoredMarkdown(page, workspaceName, noteName, initialMarkdown);
  await page.reload({ waitUntil: 'networkidle' });

  const editor = getEditorLocator(page, {});
  await expect(
    editor.getByRole('link', { name: 'ordinary [[target]]' }),
  ).toBeVisible();
  await expect(
    editor.getByRole('link', { name: 'target (note not found)' }),
  ).toHaveCount(0);
  await expect
    .poll(() => readStoredMarkdown(page, workspaceName, noteName))
    .toBe(initialMarkdown);

  await page.reload({ waitUntil: 'networkidle' });
  await expect(
    editor.getByRole('link', { name: 'ordinary [[target]]' }),
  ).toBeVisible();
});

test('uses Markdown escape parity for typed wiki links across reload', async ({
  page,
}) => {
  const workspaceName = 'wiki-link-typed-escapes';
  await createBrowserWorkspaceAndNote(page, {
    workspaceName,
    noteName: 'Home',
  });
  await writeStoredMarkdown(page, workspaceName, 'Target', 'target content');
  await page.reload({ waitUntil: 'networkidle' });

  const editor = getEditorLocator(page, {});
  await expect(editor).toBeVisible();
  await editor.click();
  await waitForEditorFocus(page, {});

  await page.keyboard.insertText('\\');
  await page.keyboard.insertText('[');
  await page.keyboard.insertText('[');
  await page.keyboard.insertText('Target');
  await page.keyboard.insertText(']');
  await page.keyboard.insertText(']');

  await expect(editor.getByRole('link', { name: 'Target' })).toHaveCount(0);
  await expect(editor).toContainText('[[Target]]');
  await expect
    .poll(() => readStoredMarkdown(page, workspaceName, 'Home'))
    .toBe(String.raw`\\\[\[Target\]\]`);

  await page.reload({ waitUntil: 'networkidle' });
  await expect(editor.getByRole('link', { name: 'Target' })).toHaveCount(0);
  await expect(editor).toContainText('[[Target]]');
  await expect
    .poll(() => readStoredMarkdown(page, workspaceName, 'Home'))
    .toBe(String.raw`\\\[\[Target\]\]`);
  await editor.click();
  await waitForEditorFocus(page, {});
  await clearEditor(page, {});
  await page.keyboard.insertText('\\');
  await page.keyboard.insertText('\\');
  await page.keyboard.insertText('[');
  await page.keyboard.insertText('[');
  await page.keyboard.insertText('Target');
  await page.keyboard.insertText(']');
  await page.keyboard.insertText(']');

  await expect(editor.getByRole('link', { name: 'Target' })).toBeVisible();
  await expect
    .poll(() => readStoredMarkdown(page, workspaceName, 'Home'))
    .toBe(String.raw`\\\\[[Target]]`);

  await page.reload({ waitUntil: 'networkidle' });
  await expect(editor.getByRole('link', { name: 'Target' })).toBeVisible();
  await expect(editor).toContainText('\\\\');
  await expect
    .poll(() => readStoredMarkdown(page, workspaceName, 'Home'))
    .toBe(String.raw`\\\\[[Target]]`);
});

test('pins the unresolved option and remains usable in a large workspace', async ({
  page,
}) => {
  const workspaceName = 'wiki-link-large';
  await createBrowserWorkspace(page, { workspaceName });
  await writeManyStoredMarkdown(page, workspaceName, [
    { noteName: 'Home', markdown: '' },
    { noteName: 'TargetLarge', markdown: 'large target content' },
    ...Array.from({ length: 1000 }, (_, index) => ({
      noteName: `generated/Note${String(index).padStart(4, '0')}`,
      markdown: `generated ${index}`,
    })),
  ]);
  await page.reload({ waitUntil: 'networkidle' });
  await page.goto(
    `/ws#route=editor&wsPath=${encodeURIComponent(`${workspaceName}:Home.md`)}`,
  );

  const editor = getEditorLocator(page, {});
  await expect(editor).toBeVisible();
  await editor.click();
  await waitForEditorFocus(page, {});
  await page.keyboard.insertText('[');
  await page.keyboard.insertText('[');
  const picker = page.getByRole('listbox', { name: 'Link to a note' });
  await expect(picker).toBeVisible();
  await page.keyboard.insertText('NoExistingNote');
  await expect(
    picker.getByRole('option', { name: 'Link to “NoExistingNote”' }),
  ).toBeVisible();

  await page.keyboard.press('Escape');
  await clearEditor(page, {});
  await page.keyboard.insertText('[');
  await page.keyboard.insertText('[');
  await page.keyboard.insertText('TargetLarge');
  await expect(
    picker.getByRole('option', { name: 'TargetLarge', exact: true }),
  ).toBeVisible();
  await page.keyboard.press('Enter');
  await expect(
    editor.getByRole('link', { name: 'TargetLarge', exact: true }),
  ).toBeVisible();
  await expect
    .poll(() => readStoredMarkdown(page, workspaceName, 'Home'))
    .toBe('[[TargetLarge]]');
});
