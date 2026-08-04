import { expect, type Page, test } from '@playwright/test';
import {
  clearEditor,
  collapseEditorSelection,
  expectNoPageHorizontalOverflow,
  getEditorLocator,
  readSeededBrowserNote,
  seedBrowserWorkspaceAndNote,
  selectEditorText,
  waitForEditorFocus,
  waitForSeededBrowserNote,
} from './common';

type DebugServices = {
  core: {
    fileSystem: {
      createTextFile(wsPath: string, text: string): Promise<void>;
      listNoteFiles(workspaceName: string): Promise<string[]>;
    };
  };
};

type DebugWindow = Window &
  typeof globalThis & {
    services?: DebugServices;
  };

type WikiSeedFile = {
  markdown: string;
  noteName: string;
};

const WIKI_SCALE_BUDGET_MS = 5_000;
const WIKI_SCALE_ENABLED = process.env.BANGLE_E2E_WIKI_SCALE === '1';

function markdownFileName(noteName: string): string {
  return noteName.endsWith('.md') ? noteName : `${noteName}.md`;
}

function wsPath(workspaceName: string, noteName: string): string {
  return `${workspaceName}:${markdownFileName(noteName)}`;
}

async function createWikiNotes(
  page: Page,
  workspaceName: string,
  files: readonly WikiSeedFile[],
) {
  await page.evaluate(
    async ({ entries, wsName }) => {
      const services = (window as DebugWindow).services?.core;
      if (!services) throw new Error('Debug services are unavailable');

      // The real file-system service owns each durable write; serializing the
      // batch avoids turning the scale fixture into a storage-concurrency test.
      for (const entry of entries) {
        await services.fileSystem.createTextFile(
          `${wsName}:${entry.fileName}`,
          entry.markdown,
        );
      }
    },
    {
      entries: files.map((file) => ({
        fileName: markdownFileName(file.noteName),
        markdown: file.markdown,
      })),
      wsName: workspaceName,
    },
  );
}

async function listWikiNotePaths(page: Page, workspaceName: string) {
  return page.evaluate(async (wsName) => {
    const services = (window as DebugWindow).services?.core;
    if (!services) throw new Error('Debug services are unavailable');
    return (await services.fileSystem.listNoteFiles(wsName)).sort();
  }, workspaceName);
}

async function seedWikiWorkspace(
  page: Page,
  {
    files = [],
    homeMarkdown = '',
    workspaceName,
  }: {
    files?: readonly WikiSeedFile[];
    homeMarkdown?: string;
    workspaceName: string;
  },
) {
  const home = await seedBrowserWorkspaceAndNote(page, {
    initialMarkdown: homeMarkdown,
    noteName: 'Home',
    workspaceName,
  });
  await createWikiNotes(page, workspaceName, files);
  return home;
}

test('authors wiki links through keyboard and pointer menu workflows with exact persistence', async ({
  page,
}) => {
  const home = await seedWikiWorkspace(page, {
    files: [
      { markdown: 'target content', noteName: 'Target' },
      { markdown: 'folder duplicate', noteName: 'folder/Duplicate' },
      { markdown: 'other duplicate', noteName: 'other/Duplicate' },
    ],
    workspaceName: 'wiki-authoring',
  });
  const editor = getEditorLocator(page, {});
  const picker = page.getByRole('listbox', { name: 'Link to a note' });

  await editor.click();
  await waitForEditorFocus(page, {});
  await page.keyboard.insertText('[');
  await page.keyboard.insertText('[');
  await expect(picker).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(picker).toBeHidden();
  await expect
    .poll(() => readSeededBrowserNote(page, home))
    .toBe(String.raw`\[\[`);
  await page.keyboard.insertText('Missing');
  await page.keyboard.insertText(']');
  await page.keyboard.insertText(']');
  await expect(
    editor.getByRole('link', { name: 'Missing (note not found)' }),
  ).toBeVisible();
  await expect
    .poll(() => readSeededBrowserNote(page, home))
    .toBe('[[Missing]]');

  await clearEditor(page, {});
  await page.keyboard.insertText('Start ');
  await page.keyboard.insertText('[');
  await page.keyboard.insertText('[');
  await expect(picker).toBeVisible();
  await expect(
    picker.getByRole('option', { name: 'Home', exact: true }),
  ).toHaveCount(0);
  await expect(
    picker.getByRole('option', { name: 'Target', exact: true }),
  ).toBeVisible();

  await page.keyboard.insertText('Tar');
  const targetOption = picker.getByRole('option', {
    name: 'Target',
    exact: true,
  });
  const unresolvedTarget = picker.getByRole('option', {
    name: 'Link to “Tar”',
  });
  await expect(targetOption).toHaveAttribute('aria-selected', 'true');
  await page.keyboard.press('ArrowDown');
  await expect(unresolvedTarget).toHaveAttribute('aria-selected', 'true');
  await page.keyboard.press('ArrowUp');
  await expect(targetOption).toHaveAttribute('aria-selected', 'true');
  await page.keyboard.press('Enter');
  await expect(
    editor.getByRole('link', { name: 'Target', exact: true }),
  ).toBeVisible();

  await page.keyboard.insertText(' and ');
  await page.keyboard.insertText('[');
  await page.keyboard.insertText('[');
  await page.keyboard.insertText('Duplicate');
  const folderDuplicate = picker.getByRole('option').filter({
    has: page.getByText('folder/', { exact: true }),
  });
  await expect(folderDuplicate).toBeVisible();
  await expect(folderDuplicate).toContainText('Duplicate');
  await folderDuplicate.click();
  await expect(
    editor.getByRole('link', { name: 'Duplicate', exact: true }),
  ).toBeVisible();

  await page.keyboard.insertText(' and ');
  await page.keyboard.insertText('[');
  await page.keyboard.insertText('[');
  await page.keyboard.insertText('Missing|Alias');
  const aliasOption = picker.getByRole('option', {
    name: 'Link to “Missing|Alias”',
  });
  await expect(aliasOption).toBeVisible();
  await page.keyboard.press('Enter');
  await expect(
    editor.getByRole('link', { name: 'Alias (note not found)' }),
  ).toBeVisible();

  const expectedMarkdown =
    'Start [[Target]] and [[/folder/Duplicate]] and [[Missing|Alias]]';
  await expect
    .poll(() => readSeededBrowserNote(page, home))
    .toBe(expectedMarkdown);
  await page.reload({ waitUntil: 'domcontentloaded' });
  await waitForSeededBrowserNote(page, home);
  await expect
    .poll(() => readSeededBrowserNote(page, home))
    .toBe(expectedMarkdown);
  await expect(
    editor.getByRole('link', { name: 'Alias (note not found)' }),
  ).toBeVisible();
});

test('keeps wiki suggestions closed while typing literal brackets inside a Markdown link', async ({
  page,
}) => {
  const home = await seedWikiWorkspace(page, {
    workspaceName: 'wiki-markdown-link-input',
  });
  const editor = getEditorLocator(page, {});
  const picker = page.getByRole('listbox', { name: 'Link to a note' });

  await editor.click();
  await waitForEditorFocus(page, {});
  await page.keyboard.insertText('visit example');
  await selectEditorText(page, 'example');
  await page.getByRole('button', { name: 'Link', exact: true }).click();
  const urlInput = page.getByRole('textbox', { name: 'Link URL' });
  await urlInput.fill('https://example.com');
  await urlInput.press('Enter');
  await expect
    .poll(() => readSeededBrowserNote(page, home))
    .toBe('visit [example](https://example.com/)');

  await collapseEditorSelection(page, 9);
  await page.keyboard.insertText('[');
  await page.keyboard.insertText('[');
  await expect(picker).toHaveCount(0);
  await expect(editor.getByRole('link', { name: 'exa[[mple' })).toBeVisible();
  const expectedMarkdown = String.raw`visit [exa\[\[mple](https://example.com/)`;
  await expect
    .poll(() => readSeededBrowserNote(page, home))
    .toBe(expectedMarkdown);

  await page.reload({ waitUntil: 'domcontentloaded' });
  await waitForSeededBrowserNote(page, home);
  await expect(editor.getByRole('link', { name: 'exa[[mple' })).toBeVisible();
  await expect(picker).toHaveCount(0);
  await expect
    .poll(() => readSeededBrowserNote(page, home))
    .toBe(expectedMarkdown);
});

test('resolves duplicate wiki-link names relative to the active note with contextual backlinks', async ({
  page,
}) => {
  const home = await seedWikiWorkspace(page, {
    files: [
      { markdown: 'root todo', noteName: 'todo' },
      { markdown: 'projects todo', noteName: 'projects/todo' },
      { markdown: 'Plan [[todo]]', noteName: 'projects/plan' },
    ],
    homeMarkdown: 'Home [[todo]]',
    workspaceName: 'wiki-closest',
  });
  const editor = getEditorLocator(page, {});
  const linkedMentions = page.getByRole('region', { name: 'Linked mentions' });
  const todoLink = editor.getByRole('link', { name: 'todo', exact: true });

  await expect(todoLink).toBeVisible();
  await todoLink.click();
  const rootTodo = { wsPath: wsPath(home.workspaceName, 'todo') };
  await waitForSeededBrowserNote(page, rootTodo);
  await expect(editor).toContainText('root todo');
  await expect(
    linkedMentions.getByRole('link', { name: 'Home.md' }),
  ).toBeVisible();
  await expect(
    linkedMentions.getByRole('link', { name: 'projects/plan.md' }),
  ).toHaveCount(0);

  const projectPlan = {
    wsPath: wsPath(home.workspaceName, 'projects/plan'),
  };
  await page.goto(
    `/ws?debug=true#route=editor&wsPath=${encodeURIComponent(projectPlan.wsPath)}`,
  );
  await waitForSeededBrowserNote(page, projectPlan);
  await expect(todoLink).toBeVisible();
  await todoLink.click();
  const projectTodo = {
    wsPath: wsPath(home.workspaceName, 'projects/todo'),
  };
  await waitForSeededBrowserNote(page, projectTodo);
  await expect(editor).toContainText('projects todo');
  await expect(
    linkedMentions.getByRole('link', { name: 'projects/plan.md' }),
  ).toBeVisible();
  await expect(
    linkedMentions.getByRole('link', { name: 'Home.md' }),
  ).toHaveCount(0);

  await expect
    .poll(() => readSeededBrowserNote(page, rootTodo))
    .toBe('root todo');
  await expect
    .poll(() => readSeededBrowserNote(page, projectTodo))
    .toBe('projects todo');
  await expect
    .poll(() => listWikiNotePaths(page, home.workspaceName))
    .toEqual(
      [
        wsPath(home.workspaceName, 'Home'),
        projectPlan.wsPath,
        projectTodo.wsPath,
        rootTodo.wsPath,
      ].sort(),
    );
});

test('navigates an implicit duplicate basename without creating a root note', async ({
  page,
}) => {
  const home = await seedWikiWorkspace(page, {
    files: [
      { markdown: 'one duplicate', noteName: 'one/Same' },
      { markdown: 'two duplicate', noteName: 'two/Same' },
    ],
    homeMarkdown: '[[Same]]',
    workspaceName: 'wiki-implicit-duplicate',
  });
  const editor = getEditorLocator(page, {});

  const same = editor.getByRole('link', { name: 'Same', exact: true });
  await expect(same).toBeVisible();
  await expect(
    editor.getByRole('link', { name: 'Same (note not found)' }),
  ).toHaveCount(0);
  await same.click();
  await waitForSeededBrowserNote(page, {
    wsPath: wsPath(home.workspaceName, 'one/Same'),
  });
  await expect(editor).toContainText('one duplicate');
  await expect.poll(() => readSeededBrowserNote(page, home)).toBe('[[Same]]');
  await expect
    .poll(() => listWikiNotePaths(page, home.workspaceName))
    .toEqual(
      [
        home.wsPath,
        wsPath(home.workspaceName, 'one/Same'),
        wsPath(home.workspaceName, 'two/Same'),
      ].sort(),
    );
});

test('activates resolved and missing chips accessibly and keeps dark affordances distinct', async ({
  page,
}) => {
  const homeMarkdown = '[[Target]] and [[Missing|Alias]]';
  const home = await seedWikiWorkspace(page, {
    files: [{ markdown: 'target content', noteName: 'Target' }],
    homeMarkdown,
    workspaceName: 'wiki-activation',
  });
  await page.evaluate(() => localStorage.setItem('color-scheme', 'dark'));
  await page.reload({ waitUntil: 'domcontentloaded' });
  await waitForSeededBrowserNote(page, home);
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
    name: 'Alias (note not found)',
  });
  await expect(target).toBeVisible();
  await expect(missing).toBeVisible();

  const [targetStyle, missingStyle] = await Promise.all(
    [target, missing].map((link) =>
      link.evaluate((node) => {
        const style = getComputedStyle(node);
        return {
          borderWidth: style.borderWidth,
          color: style.color,
          textDecorationLine: style.textDecorationLine,
          textDecorationStyle: style.textDecorationStyle,
        };
      }),
    ),
  );
  expect(targetStyle?.color).not.toBe(missingStyle?.color);
  expect(targetStyle?.textDecorationLine).toContain('underline');
  expect(targetStyle?.textDecorationLine).not.toContain('line-through');
  expect(targetStyle?.textDecorationStyle).toBe('solid');
  expect(targetStyle?.borderWidth).toBe('0px');
  expect(missingStyle?.textDecorationLine).toContain('underline');
  expect(missingStyle?.textDecorationLine).not.toContain('line-through');
  expect(missingStyle?.textDecorationStyle).toBe('dotted');
  expect(missingStyle?.borderWidth).toBe('0px');

  await target.focus();
  await page.keyboard.press('Enter');
  await waitForSeededBrowserNote(page, {
    wsPath: wsPath(home.workspaceName, 'Target'),
  });
  await expect(editor).toContainText('target content');

  await page.goBack({ waitUntil: 'domcontentloaded' });
  await waitForSeededBrowserNote(page, home);
  await editor.getByRole('link', { name: 'Alias (note not found)' }).click();
  const missingNote = { wsPath: wsPath(home.workspaceName, 'Missing') };
  await waitForSeededBrowserNote(page, missingNote);
  await expect.poll(() => readSeededBrowserNote(page, missingNote)).toBe('');
  await expect.poll(() => readSeededBrowserNote(page, home)).toBe(homeMarkdown);
});

test('keeps literal and context-sensitive wiki syntax non-destructive across reload and navigation', async ({
  page,
}) => {
  const sourceMarkdown = [
    '[ordinary [[target]]](https://example.com)',
    '',
    '`[[inline]]`',
    '',
    '```md',
    '[[fenced]]',
    '```',
    '',
    '[[nested [[bad]]]]',
    '',
    '[[ Existing.md ]] and [[ Missing.md ]]',
  ].join('\n');
  const home = await seedWikiWorkspace(page, {
    files: [{ markdown: 'existing body', noteName: 'Existing' }],
    homeMarkdown: sourceMarkdown,
    workspaceName: 'wiki-context-safety',
  });
  const editor = getEditorLocator(page, {});

  await expect(
    editor.getByRole('link', { name: 'ordinary [[target]]' }),
  ).toBeVisible();
  await expect(
    editor.getByRole('link', { name: 'target (note not found)' }),
  ).toHaveCount(0);
  await expect(editor.locator('code').first()).toHaveText('[[inline]]');
  await expect(editor.locator('pre')).toContainText('[[fenced]]');
  await expect(editor).toContainText('[[nested [[bad]]]]');
  await expect(
    editor.getByRole('link', { name: 'bad (note not found)' }),
  ).toHaveCount(0);

  const existing = editor.locator('[data-wiki-link=" Existing.md "]');
  const missing = editor.locator('[data-wiki-link=" Missing.md "]');
  await expect(existing).toHaveText('Existing');
  await expect(existing).not.toHaveClass(/wiki-link-unresolved/);
  await expect(missing).toHaveText('Missing');
  await expect(missing).toHaveClass(/wiki-link-unresolved/);
  await expect
    .poll(() => readSeededBrowserNote(page, home))
    .toBe(sourceMarkdown);

  await page.reload({ waitUntil: 'domcontentloaded' });
  await waitForSeededBrowserNote(page, home);
  await expect(
    editor.getByRole('link', { name: 'ordinary [[target]]' }),
  ).toBeVisible();
  await expect(editor.locator('code').first()).toHaveText('[[inline]]');
  await expect(editor.locator('pre')).toContainText('[[fenced]]');
  await expect(editor).toContainText('[[nested [[bad]]]]');
  await expect
    .poll(() => readSeededBrowserNote(page, home))
    .toBe(sourceMarkdown);

  await editor.locator('[data-wiki-link=" Existing.md "]').click();
  await waitForSeededBrowserNote(page, {
    wsPath: wsPath(home.workspaceName, 'Existing'),
  });
  await expect(editor).toContainText('existing body');
  await page.goBack({ waitUntil: 'domcontentloaded' });
  await waitForSeededBrowserNote(page, home);

  await editor.locator('[data-wiki-link=" Missing.md "]').click();
  const missingNote = { wsPath: wsPath(home.workspaceName, 'Missing') };
  await waitForSeededBrowserNote(page, missingNote);
  await expect.poll(() => readSeededBrowserNote(page, missingNote)).toBe('');
  await expect
    .poll(() => readSeededBrowserNote(page, home))
    .toBe(sourceMarkdown);
});

test('shows exact linked mentions with bounded layout and persists hidden collapse content', async ({
  page,
}) => {
  const target = await seedWikiWorkspace(page, {
    homeMarkdown: `Target content ${'x'.repeat(240)}`,
    workspaceName: 'wiki-linked-mentions',
  });
  const editor = getEditorLocator(page, {});
  const linkedMentions = page.getByRole('region', {
    name: 'Linked mentions',
  });

  await expect(linkedMentions).toContainText(
    'No backlinks yet. Type [[ in another note to create a backlink to this note.',
  );
  await createWikiNotes(page, target.workspaceName, [
    {
      markdown:
        'See [[Home]], [[Home|alias]], [Home](Home.md), and [Home](./Home.md).',
      noteName: 'SourceWiki',
    },
    { markdown: 'See [Home](Home.md)', noteName: 'SourceMarkdown' },
    { markdown: 'Home is plain text.', noteName: 'PlainMention' },
    {
      markdown:
        '`[[Home]]`\n\n```md\n[[Home]]\n```\n\n![[Home]]\n\n![Home](Home.md)',
      noteName: 'IgnoredSyntax',
    },
    {
      markdown: String.raw`See \[Home](Home.md) as plain text.`,
      noteName: 'EscapedMarkdown',
    },
    {
      markdown: '[ordinary [[Home]]](https://example.com)',
      noteName: 'MarkdownLinkLabel',
    },
  ]);

  await expect(
    linkedMentions.getByRole('link', { name: 'SourceWiki.md' }),
  ).toHaveCount(1);
  await expect(
    linkedMentions.getByRole('link', { name: 'SourceMarkdown.md' }),
  ).toHaveCount(1);
  for (const ignored of [
    'PlainMention.md',
    'IgnoredSyntax.md',
    'EscapedMarkdown.md',
    'MarkdownLinkLabel.md',
  ]) {
    await expect(
      linkedMentions.getByRole('link', { name: ignored }),
    ).toHaveCount(0);
  }

  await page.getByRole('button', { name: 'Toggle Max Width' }).click();
  const pageContent = page.locator('main.B-app-page-content');
  const [pageContentBox, editorBox, linkedMentionsBox, controlBox, maxWidth] =
    await Promise.all([
      pageContent.boundingBox(),
      editor.boundingBox(),
      linkedMentions.boundingBox(),
      linkedMentions
        .getByRole('button', { name: 'Collapse linked mentions' })
        .boundingBox(),
      pageContent.evaluate((element) => getComputedStyle(element).maxWidth),
    ]);
  const editorPaddingLeft = await editor.evaluate((element) =>
    Number.parseFloat(getComputedStyle(element).paddingLeft),
  );
  if (!pageContentBox || !editorBox || !linkedMentionsBox || !controlBox) {
    throw new Error('Unable to measure linked mentions layout');
  }
  expect(Number.parseFloat(maxWidth)).toBeGreaterThan(0);
  expect(pageContentBox.width).toBeLessThanOrEqual(
    Number.parseFloat(maxWidth) + 1,
  );
  expect(linkedMentionsBox.x).toBeGreaterThanOrEqual(pageContentBox.x - 1);
  expect(linkedMentionsBox.x + linkedMentionsBox.width).toBeLessThanOrEqual(
    pageContentBox.x + pageContentBox.width + 1,
  );
  expect(Math.abs(controlBox.x - (editorBox.x + editorPaddingLeft))).toBe(0);
  await expectNoPageHorizontalOverflow(page);

  await linkedMentions
    .getByRole('button', { name: 'Collapse linked mentions' })
    .click();
  await expect(
    linkedMentions.getByRole('button', { name: 'Expand linked mentions' }),
  ).toHaveAttribute('aria-expanded', 'false');
  await expect(linkedMentions.locator('#linked-mentions-content')).toHaveCount(
    0,
  );
  await expect(
    linkedMentions.getByRole('link', { name: 'SourceWiki.md' }),
  ).toHaveCount(0);

  await page.reload({ waitUntil: 'domcontentloaded' });
  await waitForSeededBrowserNote(page, target);
  await expect(
    linkedMentions.getByRole('button', { name: 'Expand linked mentions' }),
  ).toHaveAttribute('aria-expanded', 'false');
  await expect(linkedMentions.locator('#linked-mentions-content')).toHaveCount(
    0,
  );
  await expect(
    linkedMentions.getByRole('link', { name: 'SourceWiki.md' }),
  ).toHaveCount(0);

  await linkedMentions
    .getByRole('button', { name: 'Expand linked mentions' })
    .click();
  await linkedMentions.getByRole('link', { name: 'SourceWiki.md' }).click();
  await waitForSeededBrowserNote(page, {
    wsPath: wsPath(target.workspaceName, 'SourceWiki'),
  });
  await expect(editor).toContainText('See');
});

test('keeps typed wiki-link escape parity exact across reload', async ({
  page,
}) => {
  const home = await seedWikiWorkspace(page, {
    files: [{ markdown: 'target content', noteName: 'Target' }],
    workspaceName: 'wiki-typed-escapes',
  });
  const editor = getEditorLocator(page, {});

  await editor.click();
  await waitForEditorFocus(page, {});
  await page.keyboard.insertText('\\');
  await page.keyboard.insertText('[');
  await page.keyboard.insertText('[');
  await page.keyboard.insertText('Target');
  await page.keyboard.insertText(']');
  await page.keyboard.insertText(']');
  const oddEscape = String.raw`\\\[\[Target\]\]`;
  await expect(editor.getByRole('link', { name: 'Target' })).toHaveCount(0);
  await expect(editor).toContainText('[[Target]]');
  await expect.poll(() => readSeededBrowserNote(page, home)).toBe(oddEscape);

  await page.reload({ waitUntil: 'domcontentloaded' });
  await waitForSeededBrowserNote(page, home);
  await expect(editor.getByRole('link', { name: 'Target' })).toHaveCount(0);
  await expect(editor).toContainText('[[Target]]');
  await expect.poll(() => readSeededBrowserNote(page, home)).toBe(oddEscape);

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
  const evenEscape = String.raw`\\\\[[Target]]`;
  await expect(editor.getByRole('link', { name: 'Target' })).toBeVisible();
  await expect(editor).toContainText('\\\\');
  await expect.poll(() => readSeededBrowserNote(page, home)).toBe(evenEscape);

  await page.reload({ waitUntil: 'domcontentloaded' });
  await waitForSeededBrowserNote(page, home);
  await expect(editor.getByRole('link', { name: 'Target' })).toBeVisible();
  await expect(editor).toContainText('\\\\');
  await expect.poll(() => readSeededBrowserNote(page, home)).toBe(evenEscape);
});

if (WIKI_SCALE_ENABLED) {
  test(
    'keeps wiki suggestions bounded and responsive for 1,000 notes @wiki-scale',
    { tag: '@wiki-scale' },
    async ({ page }, testInfo) => {
      const home = await seedWikiWorkspace(page, {
        files: [
          { markdown: 'large target content', noteName: 'TargetLarge' },
          ...Array.from({ length: 1_000 }, (_, index) => ({
            markdown: `generated ${index}`,
            noteName: `generated/Note${String(index).padStart(4, '0')}`,
          })),
        ],
        workspaceName: 'wiki-scale',
      });
      const editor = getEditorLocator(page, {});
      const picker = page.getByRole('listbox', { name: 'Link to a note' });

      await editor.click();
      await waitForEditorFocus(page, {});
      await page.keyboard.insertText('[');
      await page.keyboard.insertText('[');
      await page.keyboard.insertText('Note0999');
      // A tail sentinel proves that the full 1,000-note index is ready. Merely
      // observing 12 options can false-pass because the UI caps every result.
      const tailSentinel = picker.getByRole('option').filter({
        has: page.getByText('Note0999', { exact: true }),
      });
      await expect(tailSentinel).toBeVisible({
        timeout: WIKI_SCALE_BUDGET_MS,
      });
      await page.keyboard.press('Escape');
      await expect(picker).toBeHidden();
      await clearEditor(page, {});
      await editor.click();
      await waitForEditorFocus(page, {});

      const startedAt = performance.now();
      let elapsedMs = 0;
      let resultCount: number | undefined;
      try {
        await page.keyboard.insertText('[');
        await page.keyboard.insertText('[');
        await page.keyboard.insertText('Note');
        const options = picker.getByRole('option');
        await expect(options).toHaveCount(12, {
          timeout: WIKI_SCALE_BUDGET_MS,
        });
        await expect(options.last()).toContainText('Link to “Note”');
        resultCount = await options.count();
      } finally {
        elapsedMs = performance.now() - startedAt;
        testInfo.annotations.push({
          description: `notes=1002 elapsedMs=${elapsedMs} resultCount=${resultCount ?? 'unavailable'} budgetMs=${WIKI_SCALE_BUDGET_MS}`,
          type: 'performance',
        });
      }
      expect(
        elapsedMs,
        `Broad wiki suggestion query exceeded ${WIKI_SCALE_BUDGET_MS}ms (notes=1002, results=${resultCount ?? 'unavailable'}).`,
      ).toBeLessThanOrEqual(WIKI_SCALE_BUDGET_MS);
      expect(resultCount).toBe(12);

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
        .poll(() => readSeededBrowserNote(page, home))
        .toBe('[[TargetLarge]]');
    },
  );
}
