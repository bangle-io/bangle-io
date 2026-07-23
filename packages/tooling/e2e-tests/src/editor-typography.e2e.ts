import { expect, type Locator, test } from '@playwright/test';
import {
  createBrowserWorkspaceAndNote,
  getEditorLocator,
  writeStoredMarkdown,
} from './common';

async function expectVerticalGap(
  previousBlock: Locator,
  heading: Locator,
  expectedGap: number,
) {
  await expect
    .poll(async () => {
      const previousBox = await previousBlock.boundingBox();
      const headingBox = await heading.boundingBox();

      if (!previousBox || !headingBox) {
        return undefined;
      }

      return headingBox.y - (previousBox.y + previousBox.height);
    })
    .toBe(expectedGap);
}

test('uses compact, predictable spacing above section headings', async ({
  page,
}) => {
  const workspaceName = 'editor-heading-spacing';
  const noteName = 'Home';
  await createBrowserWorkspaceAndNote(page, { workspaceName, noteName });
  await writeStoredMarkdown(
    page,
    workspaceName,
    noteName,
    [
      '# Page title',
      '',
      'Paragraph before H2.',
      '',
      '## Section',
      '',
      'Paragraph before H3.',
      '',
      '### Subsection',
    ].join('\n'),
  );
  await page.reload();

  const editor = getEditorLocator(page, {});
  await expectVerticalGap(
    editor.getByText('Paragraph before H2.'),
    editor.getByRole('heading', { level: 2, name: 'Section' }),
    24,
  );
  await expectVerticalGap(
    editor.getByText('Paragraph before H3.'),
    editor.getByRole('heading', { level: 3, name: 'Subsection' }),
    20,
  );
});
