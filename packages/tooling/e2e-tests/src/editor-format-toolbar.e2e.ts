import { expect, test } from '@playwright/test';
import {
  getEditorLocator,
  readSeededBrowserNote,
  seedBrowserWorkspaceAndNote,
  selectEditorText,
  waitForSeededBrowserNote,
} from './common';

test('maps active and disabled block controls through paragraph, heading, and list transitions', async ({
  page,
}) => {
  const source = 'line alpha\n\nline bravo\n\nline charlie';
  const listed = 'line alpha\n\n- line bravo\n\nline charlie';
  const seeded = await seedBrowserWorkspaceAndNote(page, {
    initialMarkdown: source,
    noteName: 'Blocks',
    workspaceName: 'format-toolbar',
  });
  const editor = getEditorLocator(page, {});
  const toolbar = page.getByRole('toolbar', { name: 'Text formatting' });
  const paragraph = toolbar.getByRole('button', { name: 'Paragraph' });
  const heading1 = toolbar.getByRole('button', { name: 'Heading 1' });
  const bulletList = toolbar.getByRole('button', { name: 'Bullet list' });

  await selectEditorText(page, 'alpha');
  await expect(toolbar).toBeVisible();
  await expect(paragraph).toHaveAttribute('aria-pressed', 'true');
  await expect(paragraph).toBeDisabled();
  await expect(heading1).toHaveAttribute('aria-pressed', 'false');
  await heading1.click();
  await expect(heading1).toHaveAttribute('aria-pressed', 'true');
  await expect(editor.getByRole('heading', { level: 1 })).toHaveText(
    'line alpha',
  );
  await expect
    .poll(() => readSeededBrowserNote(page, seeded))
    .toBe('# line alpha\n\nline bravo\n\nline charlie');
  await heading1.click();
  await expect(paragraph).toHaveAttribute('aria-pressed', 'true');
  await expect.poll(() => readSeededBrowserNote(page, seeded)).toBe(source);

  await selectEditorText(page, 'bravo');
  await bulletList.click();
  await expect(bulletList).toHaveAttribute('aria-pressed', 'true');
  await expect(paragraph).toHaveAttribute('aria-pressed', 'false');
  await expect(paragraph).toBeEnabled();
  await expect.poll(() => readSeededBrowserNote(page, seeded)).toBe(listed);
  await paragraph.click();
  await expect(paragraph).toHaveAttribute('aria-pressed', 'true');
  await expect.poll(() => readSeededBrowserNote(page, seeded)).toBe(source);

  await bulletList.click();
  await expect.poll(() => readSeededBrowserNote(page, seeded)).toBe(listed);
  await page.reload({ waitUntil: 'domcontentloaded' });
  await waitForSeededBrowserNote(page, seeded);
  await selectEditorText(page, 'bravo');
  await expect(bulletList).toHaveAttribute('aria-pressed', 'true');
  await expect(paragraph).toHaveAttribute('aria-pressed', 'false');
  await expect.poll(() => readSeededBrowserNote(page, seeded)).toBe(listed);
});
