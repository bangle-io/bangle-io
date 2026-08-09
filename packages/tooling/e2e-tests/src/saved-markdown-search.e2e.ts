import { expect, test } from '@playwright/test';
import {
  createBrowserWorkspaceAndNote,
  getEditorLocator,
  pressAppShortcut,
  writeStoredMarkdown,
} from './common';

test('saved-note search groups case-insensitive Markdown matches and opens the selected note', async ({
  page,
}) => {
  const workspaceName = 'saved-search-workspace';
  await createBrowserWorkspaceAndNote(page, {
    noteName: 'alpha',
    workspaceName,
  });
  await writeStoredMarkdown(
    page,
    workspaceName,
    'alpha',
    '# Alpha\nFirst **Needle** alpha line\nno match\nSecond needle alpha line',
  );
  await writeStoredMarkdown(
    page,
    workspaceName,
    'beta',
    '# Beta\nUPPER NEEDLE beta line',
  );
  await page.reload({ waitUntil: 'networkidle' });

  await pressAppShortcut(page, 'Shift+f');
  const dialog = page.getByRole('dialog', {
    name: 'Search saved note contents',
  });
  const input = dialog.getByPlaceholder('Search saved note Markdown...');
  await expect(input).toBeFocused();
  await input.fill('nEeDlE');

  const alphaGroup = dialog.getByRole('group', { name: 'alpha.md' });
  const betaGroup = dialog.getByRole('group', { name: 'beta.md' });
  await expect(alphaGroup.getByRole('option')).toHaveCount(2);
  await expect(betaGroup.getByRole('option')).toHaveCount(1);
  await expect(alphaGroup).toContainText('First **Needle** alpha line');
  await expect(alphaGroup).toContainText('Second needle alpha line');
  await expect(betaGroup).toContainText('UPPER NEEDLE beta line');

  await alphaGroup
    .getByRole('option')
    .filter({ hasText: 'First **Needle** alpha line' })
    .click();

  await expect(dialog).toBeHidden();
  await expect
    .poll(() => getEditorLocator(page, {}).getAttribute('data-editor-name'))
    .toContain(`${workspaceName}:alpha.md`);
  await expect(getEditorLocator(page, {})).toContainText(
    'First Needle alpha line',
  );
});
