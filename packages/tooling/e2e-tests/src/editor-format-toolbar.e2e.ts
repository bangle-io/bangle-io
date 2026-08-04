import { expect, test } from '@playwright/test';
import {
  getEditorLocator,
  readSeededBrowserNote,
  seedBrowserWorkspaceAndNote,
  selectEditorText,
  waitForSeededBrowserNote,
} from './common';

test('maps every block active state through paragraph, heading, and list transitions', async ({
  page,
}) => {
  const source = 'line alpha\n\nline bravo\n\nline charlie';
  const bullet = 'line alpha\n\n- line bravo\n\nline charlie';
  const numbered = 'line alpha\n\n1. line bravo\n\nline charlie';
  const task = 'line alpha\n\n- [ ] line bravo\n\nline charlie';
  const seeded = await seedBrowserWorkspaceAndNote(page, {
    initialMarkdown: source,
    noteName: 'Blocks',
    workspaceName: 'format-toolbar',
  });
  const editor = getEditorLocator(page, {});
  const toolbar = page.getByRole('toolbar', { name: 'Text formatting' });
  const controls = {
    bulletList: toolbar.getByRole('button', { name: 'Bullet list' }),
    heading1: toolbar.getByRole('button', { name: 'Heading 1' }),
    heading2: toolbar.getByRole('button', { name: 'Heading 2' }),
    heading3: toolbar.getByRole('button', { name: 'Heading 3' }),
    orderedList: toolbar.getByRole('button', { name: 'Numbered list' }),
    paragraph: toolbar.getByRole('button', { name: 'Paragraph' }),
    taskList: toolbar.getByRole('button', { name: 'Task list' }),
  };
  const expectOnlyActive = async (active: keyof typeof controls) => {
    for (const [name, control] of Object.entries(controls)) {
      await expect(control).toHaveAttribute(
        'aria-pressed',
        name === active ? 'true' : 'false',
      );
    }
  };

  await test.step('plain paragraph is the only active block and is a disabled no-op', async () => {
    await selectEditorText(page, 'alpha');
    await expect(toolbar).toBeVisible();
    await expectOnlyActive('paragraph');
    await expect(controls.paragraph).toBeDisabled();
  });

  await test.step('activate every heading level and return to a paragraph', async () => {
    await controls.heading1.click();
    await expectOnlyActive('heading1');
    await expect(editor.getByRole('heading', { level: 1 })).toHaveText(
      'line alpha',
    );
    await expect
      .poll(() => readSeededBrowserNote(page, seeded))
      .toBe('# line alpha\n\nline bravo\n\nline charlie');

    await controls.heading2.click();
    await expectOnlyActive('heading2');
    await expect(editor.getByRole('heading', { level: 2 })).toHaveText(
      'line alpha',
    );
    await expect
      .poll(() => readSeededBrowserNote(page, seeded))
      .toBe('## line alpha\n\nline bravo\n\nline charlie');

    await controls.heading3.click();
    await expectOnlyActive('heading3');
    await expect(editor.getByRole('heading', { level: 3 })).toHaveText(
      'line alpha',
    );
    await expect
      .poll(() => readSeededBrowserNote(page, seeded))
      .toBe('### line alpha\n\nline bravo\n\nline charlie');

    await controls.paragraph.click();
    await expectOnlyActive('paragraph');
    await expect.poll(() => readSeededBrowserNote(page, seeded)).toBe(source);
  });

  await test.step('activate every list kind and persist the final kind after reload', async () => {
    await selectEditorText(page, 'bravo');
    await controls.bulletList.click();
    await expectOnlyActive('bulletList');
    await expect(controls.paragraph).toBeEnabled();
    await expect.poll(() => readSeededBrowserNote(page, seeded)).toBe(bullet);

    await controls.paragraph.click();
    await expectOnlyActive('paragraph');
    await expect.poll(() => readSeededBrowserNote(page, seeded)).toBe(source);

    await controls.orderedList.click();
    await expectOnlyActive('orderedList');
    await expect.poll(() => readSeededBrowserNote(page, seeded)).toBe(numbered);

    await controls.paragraph.click();
    await expectOnlyActive('paragraph');
    await expect.poll(() => readSeededBrowserNote(page, seeded)).toBe(source);

    await controls.taskList.click();
    await expectOnlyActive('taskList');
    await expect.poll(() => readSeededBrowserNote(page, seeded)).toBe(task);
    await page.reload({ waitUntil: 'domcontentloaded' });
    await waitForSeededBrowserNote(page, seeded);
    await selectEditorText(page, 'bravo');
    await expectOnlyActive('taskList');
    await expect.poll(() => readSeededBrowserNote(page, seeded)).toBe(task);
  });
});

test('flattens deeply nested blocks to exact Markdown without a nesting cap', async ({
  page,
}) => {
  const source = `${'> '.repeat(10)}- deep item`;
  const seeded = await seedBrowserWorkspaceAndNote(page, {
    initialMarkdown: source,
    noteName: 'Deep blocks',
    workspaceName: 'format-toolbar-deep',
  });
  const toolbar = page.getByRole('toolbar', { name: 'Text formatting' });
  const paragraph = toolbar.getByRole('button', { name: 'Paragraph' });

  await test.step('flatten all blockquote and list levels in one click', async () => {
    await selectEditorText(page, 'deep item');
    await expect(toolbar).toBeVisible();
    await expect(paragraph).toBeEnabled();
    await expect(paragraph).toHaveAttribute('aria-pressed', 'false');
    await paragraph.click();
    await expect(paragraph).toHaveAttribute('aria-pressed', 'true');
    await expect
      .poll(() => readSeededBrowserNote(page, seeded))
      .toBe('deep item');
  });
});

test('block controls preserve frontmatter and fenced code across select-all conversions', async ({
  page,
}) => {
  const source =
    '---\ntitle: my note\n---\n\n# alpha\n\n```js\nconst a = 1;\nconst b = 2;\n```\n\nbravo';
  const headings =
    '---\ntitle: my note\n---\n\n## alpha\n\n```js\nconst a = 1;\nconst b = 2;\n```\n\n## bravo';
  const paragraphs = source.replace('# alpha', 'alpha');
  const seeded = await seedBrowserWorkspaceAndNote(page, {
    initialMarkdown: source,
    noteName: 'Protected blocks',
    workspaceName: 'format-toolbar-protected',
  });
  const editor = getEditorLocator(page, {}).first();
  const toolbar = page.getByRole('toolbar', { name: 'Text formatting' });

  await test.step('turn prose into headings without rewriting protected blocks', async () => {
    await editor.click();
    await page.keyboard.press('ControlOrMeta+a');
    await expect(toolbar).toBeVisible();
    await toolbar.getByRole('button', { name: 'Heading 2' }).click();
    await expect.poll(() => readSeededBrowserNote(page, seeded)).toBe(headings);
  });

  await test.step('turn prose back into paragraphs without rewriting protected blocks', async () => {
    await editor.click();
    await page.keyboard.press('ControlOrMeta+a');
    await expect(toolbar).toBeVisible();
    await toolbar.getByRole('button', { name: 'Paragraph' }).click();
    await expect
      .poll(() => readSeededBrowserNote(page, seeded))
      .toBe(paragraphs);
  });
});
