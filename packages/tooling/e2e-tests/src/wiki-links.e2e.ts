import { expect, type Page, test } from '@playwright/test';
import {
  clearEditor,
  collapseEditorSelectionAfterText,
  getEditorLocator,
  readSeededBrowserNote,
  seedBrowserWorkspaceAndNote,
  waitForEditorFocus,
  waitForSeededBrowserNote,
} from './common';

type DebugServices = {
  core: {
    fileSystem: {
      createTextFile(wsPath: string, text: string): Promise<void>;
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

test('authors canonical wiki links, navigates safely, creates missing targets, and keeps dark affordances distinct', async ({
  page,
}) => {
  const home = await seedWikiWorkspace(page, {
    files: [{ markdown: 'target content', noteName: 'Target' }],
    homeMarkdown: 'Start',
    workspaceName: 'wiki-canonical',
  });
  const editor = getEditorLocator(page, {});
  const picker = page.getByRole('listbox', { name: 'Link to a note' });

  await collapseEditorSelectionAfterText(page, 'Start');
  await page.keyboard.insertText(' ');
  await page.keyboard.insertText('[');
  await page.keyboard.insertText('[');
  await expect(picker).toBeVisible();
  await page.keyboard.insertText('Tar');
  const targetOption = picker.getByRole('option', { name: 'Target' });
  await expect(targetOption).toBeVisible();
  await expect(
    picker.getByRole('option', { name: 'Link to “Tar”' }),
  ).toBeVisible();
  await page.keyboard.press('Enter');

  const target = editor.getByRole('link', { name: 'Target', exact: true });
  await expect(target).toBeVisible();
  await page.keyboard.insertText(' and ');
  await page.keyboard.insertText('[');
  await page.keyboard.insertText('[');
  await page.keyboard.insertText('Missing');
  await page.keyboard.insertText(']');
  await page.keyboard.insertText(']');
  const expectedHome = 'Start [[Target]] and [[Missing]]';
  await expect.poll(() => readSeededBrowserNote(page, home)).toBe(expectedHome);

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

  const darkTarget = editor.getByRole('link', { name: 'Target', exact: true });
  const missing = editor.getByRole('link', {
    name: 'Missing (note not found)',
  });
  await expect(darkTarget).toBeVisible();
  await expect(missing).toBeVisible();
  const [targetStyle, missingStyle] = await Promise.all(
    [darkTarget, missing].map((link) =>
      link.evaluate((node) => {
        const style = getComputedStyle(node);
        return {
          color: style.color,
          textDecorationStyle: style.textDecorationStyle,
        };
      }),
    ),
  );
  expect(targetStyle?.color).not.toBe(missingStyle?.color);
  expect(targetStyle?.textDecorationStyle).toBe('solid');
  expect(missingStyle?.textDecorationStyle).toBe('dotted');

  await darkTarget.click();
  await waitForSeededBrowserNote(page, {
    wsPath: wsPath(home.workspaceName, 'Target'),
  });
  await expect(editor).toContainText('target content');
  await page.goBack({ waitUntil: 'domcontentloaded' });
  await waitForSeededBrowserNote(page, home);

  await editor.getByRole('link', { name: 'Missing (note not found)' }).click();
  const missingNote = { wsPath: wsPath(home.workspaceName, 'Missing') };
  await waitForSeededBrowserNote(page, missingNote);
  await expect.poll(() => readSeededBrowserNote(page, missingNote)).toBe('');
  await expect.poll(() => readSeededBrowserNote(page, home)).toBe(expectedHome);
});

test('shows the linked-mentions empty-to-ready lifecycle and persists collapse while retaining navigation', async ({
  page,
}) => {
  const target = await seedWikiWorkspace(page, {
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
    {
      markdown: '`[[Home]]`\n\n```md\n[[Home]]\n```\n\n![[Home]]',
      noteName: 'IgnoredSyntax',
    },
  ]);
  await expect(
    linkedMentions.getByRole('link', { name: 'SourceWiki.md' }),
  ).toHaveCount(1);
  await expect(
    linkedMentions.getByRole('link', { name: 'SourceMarkdown.md' }),
  ).toHaveCount(1);
  await expect(
    linkedMentions.getByRole('link', { name: 'IgnoredSyntax.md' }),
  ).toHaveCount(0);

  await linkedMentions
    .getByRole('button', { name: 'Collapse linked mentions' })
    .click();
  await expect(
    linkedMentions.getByRole('button', { name: 'Expand linked mentions' }),
  ).toHaveAttribute('aria-expanded', 'false');
  await page.reload({ waitUntil: 'domcontentloaded' });
  await waitForSeededBrowserNote(page, target);
  await expect(
    linkedMentions.getByRole('button', { name: 'Expand linked mentions' }),
  ).toHaveAttribute('aria-expanded', 'false');

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
  await expect.poll(() => readSeededBrowserNote(page, home)).toBe(oddEscape);

  await page.reload({ waitUntil: 'domcontentloaded' });
  await waitForSeededBrowserNote(page, home);
  await expect(editor.getByRole('link', { name: 'Target' })).toHaveCount(0);
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
  await expect.poll(() => readSeededBrowserNote(page, home)).toBe(evenEscape);

  await page.reload({ waitUntil: 'domcontentloaded' });
  await waitForSeededBrowserNote(page, home);
  await expect(editor.getByRole('link', { name: 'Target' })).toBeVisible();
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
      // Wait for the full workspace index before timing the unresolved-only
      // query. Otherwise the unresolved fallback can appear before indexing
      // completes and make an unready 1,002-note fixture look responsive.
      await expect(picker.getByRole('option')).toHaveCount(12, {
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
        const unresolved = picker.getByRole('option', {
          name: 'Link to “NoExistingNote”',
        });
        await page.keyboard.insertText('NoExistingNote');
        await expect(unresolved).toBeVisible({
          timeout: WIKI_SCALE_BUDGET_MS,
        });
        resultCount = await picker.getByRole('option').count();
      } finally {
        elapsedMs = performance.now() - startedAt;
        testInfo.annotations.push({
          description: `notes=1002 elapsedMs=${elapsedMs} resultCount=${resultCount ?? 'unavailable'} budgetMs=${WIKI_SCALE_BUDGET_MS}`,
          type: 'performance',
        });
      }
      expect(
        elapsedMs,
        `Wiki suggestion query exceeded ${WIKI_SCALE_BUDGET_MS}ms (notes=1002, results=${resultCount ?? 'unavailable'}).`,
      ).toBeLessThanOrEqual(WIKI_SCALE_BUDGET_MS);
      expect(resultCount).toBe(1);

      await page.keyboard.press('Escape');
      await clearEditor(page, {});
      await page.keyboard.insertText('[');
      await page.keyboard.insertText('[');
      await expect(picker.getByRole('option')).toHaveCount(12);
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
