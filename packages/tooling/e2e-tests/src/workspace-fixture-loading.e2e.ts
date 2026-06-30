import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { expect, test } from '@playwright/test';
import {
  ctrlKey,
  getEditorLocator,
  loadBrowserWorkspaceFixture,
  pressAppShortcut,
  readStoredMarkdown,
} from './common';

const fixtureDirectory = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  'fixtures/workspaces/markdown-loading',
);
const edgeCasesFixtureDirectory = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  'fixtures/workspaces/markdown-edge-cases',
);

test('loads a workspace directory fixture from raw files', async ({ page }) => {
  const fixture = await loadBrowserWorkspaceFixture(page, fixtureDirectory);

  expect(fixture).toEqual({
    workspaceName: 'markdown-loading',
    files: ['nested/checklist.md', 'welcome.md'],
  });
  await expect(page.getByRole('link', { name: 'welcome.md' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'checklist.md' })).toBeVisible();

  await page.getByRole('link', { name: 'welcome.md' }).click();
  const editor = getEditorLocator(page, {});
  await expect(
    editor.getByRole('heading', { name: 'Fixture workspace' }),
  ).toBeVisible();
  await expect(editor).toContainText(
    'This note was loaded from raw Markdown on disk.',
  );
  await expect
    .poll(() => readStoredMarkdown(page, 'markdown-loading', 'welcome'))
    .toBe(
      '# Fixture workspace\n\nThis note was loaded from raw Markdown on disk.\n\n- First item\n- Second item\n',
    );
});

test('discovers a curated multi-file Markdown workspace', async ({ page }) => {
  await page.addInitScript(() => {
    Object.assign(globalThis, {
      __bangleFixtureHandlerExecuted: false,
      __bangleFixtureIframeExecuted: false,
      __bangleFixtureScriptExecuted: false,
    });
  });
  const fixture = await loadBrowserWorkspaceFixture(
    page,
    edgeCasesFixtureDirectory,
  );

  expect(fixture.workspaceName).toBe('markdown-edge-cases');
  expect(fixture.files).toHaveLength(16);
  expect(fixture.files).toContain('nested/11-unicode-😀.md');
  expect(fixture.files).toContain('notes with spaces/linked note.md');

  await expect(
    page.getByRole('heading', { name: 'markdown-edge-cases' }),
  ).toBeVisible();
  await page.getByRole('link', { name: '00-overview.md' }).click();
  await expect(
    getEditorLocator(page, {}).getByRole('heading', {
      name: 'Markdown edge-case workspace',
    }),
  ).toBeVisible();
  await expect
    .poll(() => readStoredMarkdown(page, 'markdown-edge-cases', '00-overview'))
    .toContain(
      '[A path containing spaces](notes%20with%20spaces/linked%20note.md)',
    );

  const linkedNote = getEditorLocator(page, {}).getByRole('link', {
    name: 'A path containing spaces',
  });
  await page.keyboard.down(ctrlKey);
  await linkedNote.click();
  await page.keyboard.up(ctrlKey);
  await expect(
    page
      .getByLabel('breadcrumb')
      .getByRole('button', { name: 'linked note.md' }),
  ).toBeVisible();
  await expect(
    getEditorLocator(page, {}).getByRole('heading', {
      name: 'Linked note with spaces',
    }),
  ).toBeVisible();

  const backToOverview = getEditorLocator(page, {}).getByRole('link', {
    name: 'Back to overview',
  });
  await page.keyboard.down(ctrlKey);
  await backToOverview.click();
  await page.keyboard.up(ctrlKey);
  await expect(page).toHaveURL(
    /ws#route=editor&wsPath=markdown-edge-cases%3A00-overview\.md$/,
  );
  await expect(
    getEditorLocator(page, {}).getByRole('heading', {
      name: 'Markdown edge-case workspace',
    }),
  ).toBeVisible();

  await pressAppShortcut(page, 'k');
  await page
    .getByPlaceholder('Type a command or search...')
    .fill('10-raw-html.md');
  await page.keyboard.press('Enter');
  await expect(
    page
      .getByLabel('breadcrumb')
      .getByRole('button', { name: '10-raw-html.md' }),
  ).toBeVisible();
  await expect
    .poll(() =>
      page.evaluate(() => [
        Reflect.get(globalThis, '__bangleFixtureScriptExecuted'),
        Reflect.get(globalThis, '__bangleFixtureHandlerExecuted'),
        Reflect.get(globalThis, '__bangleFixtureIframeExecuted'),
      ]),
    )
    .toEqual([false, false, false]);
  await expect
    .poll(() =>
      readStoredMarkdown(
        page,
        'markdown-edge-cases',
        'nested/deep/10-raw-html',
      ),
    )
    .toContain(
      '<script>globalThis.__bangleFixtureScriptExecuted = true</script>',
    );
});

test('follows interoperable relative Markdown link forms', async ({ page }) => {
  await loadBrowserWorkspaceFixture(page, edgeCasesFixtureDirectory);
  await page.getByRole('link', { name: '00-overview.md' }).click();

  const modifierClick = async (name: string) => {
    await page.keyboard.down(ctrlKey);
    await getEditorLocator(page, {}).getByRole('link', { name }).click();
    await page.keyboard.up(ctrlKey);
  };
  const expectHeading = async (name: string) => {
    await expect(
      getEditorLocator(page, {}).getByRole('heading', { name }),
    ).toBeVisible();
  };

  await modifierClick('Interoperability paths');
  await expectHeading('Interoperable Markdown links');

  await modifierClick('Jump within this note');
  await expect
    .poll(() =>
      page.evaluate(() => {
        const view = Reflect.get(globalThis, 'editorView');
        return view?.state.selection.$from.parent.textContent;
      }),
    )
    .toBe('Current File Target: punctuation!');

  await modifierClick('Angle-bracket path with spaces');
  await expectHeading('Linked note with spaces');
  await modifierClick('Back to overview');
  await expectHeading('Markdown edge-case workspace');

  await modifierClick('A dotted directory');
  await expectHeading('Note in a dotted directory');
  await modifierClick('Back from dotted directory');
  await expectHeading('Markdown edge-case workspace');

  await modifierClick('Interoperability paths');
  await modifierClick('Explicit sibling path');
  await expectHeading('Explicit sibling note');

  await modifierClick('Back to interoperability links');
  await expectHeading('Interoperable Markdown links');
  await modifierClick('Two parents back to overview');
  await expectHeading('Markdown edge-case workspace');
  await expect(page).toHaveURL(
    /ws#route=editor&wsPath=markdown-edge-cases%3A00-overview\.md$/,
  );
});
