import { expect, type Locator, test } from '@playwright/test';
import {
  clearEditor,
  createBrowserWorkspaceAndNote,
  getEditorLocator,
  readStoredMarkdown,
} from './common';

async function pasteHtml(editor: Locator, html: string, text: string) {
  return editor.evaluate(
    (element, clipboard) => {
      const clipboardData = new DataTransfer();
      clipboardData.setData('text/html', clipboard.html);
      clipboardData.setData('text/plain', clipboard.text);
      const event = new ClipboardEvent('paste', {
        bubbles: true,
        cancelable: true,
        clipboardData,
      });
      element.dispatchEvent(event);
      return event.defaultPrevented;
    },
    { html, text },
  );
}

test('HTML paste rejects untrusted slice attributes and preserves ordinary rich text', async ({
  page,
}) => {
  const workspaceName = 'clipboard-html-safety';
  const noteName = 'Pasted HTML';
  await createBrowserWorkspaceAndNote(page, { workspaceName, noteName });
  const editor = getEditorLocator(page, {});
  await expect(editor).toHaveAttribute('contenteditable', 'true');
  await editor.click();

  const executableAttribute =
    "document.documentElement.dataset.pasteExecuted = 'true'";
  const context = JSON.stringify([
    'blockquote',
    { onmouseover: executableAttribute },
  ]);
  const escapedContext = context
    .replaceAll('&', '&amp;')
    .replaceAll('"', '&quot;');
  const html = `<p data-pm-slice="0 0 ${escapedContext}" onmouseover="${executableAttribute}"><strong>Safe pasted text</strong></p>`;
  expect(await pasteHtml(editor, html, 'Safe pasted text')).toBe(true);

  const pastedText = editor.locator('strong', { hasText: 'Safe pasted text' });
  await expect(pastedText).toBeVisible();
  // Invalid context attributes must not create a schema wrapper around the
  // otherwise valid clipboard content.
  await expect(editor.locator('blockquote')).toHaveCount(0);
  await expect(editor.locator('[onmouseover], [onerror], script')).toHaveCount(
    0,
  );
  await pastedText.hover();
  await expect(page.locator('html')).not.toHaveAttribute(
    'data-paste-executed',
    'true',
  );
  await expect
    .poll(() => readStoredMarkdown(page, workspaceName, noteName))
    .toBe('**Safe pasted text**');

  await page.reload();
  await expect(editor.locator('strong')).toHaveText('Safe pasted text');
  await expect(editor.locator('blockquote')).toHaveCount(0);
  await expect(editor).toHaveAttribute('contenteditable', 'true');
  await clearEditor(page, {});
  expect(
    await pasteHtml(
      editor,
      '<blockquote><p>Ordinary quoted text</p></blockquote><p>Normal <strong>rich text</strong></p>',
      'Ordinary quoted text\n\nNormal rich text',
    ),
  ).toBe(true);
  await expect(editor.locator('blockquote')).toHaveText('Ordinary quoted text');
  await expect(editor.locator('strong')).toHaveText('rich text');
  const expected = '> Ordinary quoted text\n\nNormal **rich text**';
  await expect
    .poll(() => readStoredMarkdown(page, workspaceName, noteName))
    .toBe(expected);

  await page.reload();
  await expect(editor.locator('blockquote')).toHaveText('Ordinary quoted text');
  await expect(editor.locator('strong')).toHaveText('rich text');
  await expect
    .poll(() => readStoredMarkdown(page, workspaceName, noteName))
    .toBe(expected);
});
