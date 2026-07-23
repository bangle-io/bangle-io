import { expect, test } from '@playwright/test';
import {
  createBrowserWorkspaceAndNote,
  EDITOR_FOCUSED_SELECTOR,
  getEditorLocator,
  pressAppShortcut,
  waitForEditorFocus,
} from './common';

const workspaceName = 'select-all-scope';
const noteBody = 'alpha bravo charlie';

// Regression: clicking the empty padding around a short note left focus on the
// page body, so Cmd/Ctrl-A ran the browser's document-wide select-all and swept
// the sidebar and app chrome into the selection. The shortcut must instead stay
// scoped to the note.
test('Cmd/Ctrl-A from the editor pane whitespace selects only the note', async ({
  page,
}) => {
  await createBrowserWorkspaceAndNote(page, {
    workspaceName,
    noteName: 'note-a',
  });
  const editor = getEditorLocator(page, {});
  await waitForEditorFocus(page, {});
  await editor.fill(noteBody);
  await expect(editor).toHaveText(noteBody);

  // Click the empty pane whitespace just below the note (the flex gap before
  // "Linked mentions"), the region a user clicks when the note is short.
  const box = await editor.boundingBox();
  if (!box) {
    throw new Error('Expected the editor to expose a bounding box');
  }
  await page.mouse.click(box.x + box.width / 2, box.y + box.height + 8);

  // Guard: the click must actually leave the contenteditable, otherwise the
  // test would pass vacuously by never reproducing the unfocused state.
  await expect(page.locator(EDITOR_FOCUSED_SELECTOR)).toBeHidden();

  // Cmd/Ctrl-A is an app-level shortcut (ShortcutManager), so press the
  // modifier the app itself bound. See pressAppShortcut for why this differs
  // from the editor's own Mod-a under headless Chromium.
  await pressAppShortcut(page, 'a');

  // The fix re-homes the shortcut into the note: the editor regains focus and
  // the selection is scoped to it rather than the whole document.
  await waitForEditorFocus(page, {});
  const selection = await page.evaluate(() => {
    const pm = document.querySelector('.ProseMirror');
    const sel = window.getSelection();
    const text = sel ? sel.toString() : '';
    const range = sel && sel.rangeCount ? sel.getRangeAt(0) : null;
    const container = range ? range.commonAncestorContainer : null;
    const ancestor =
      container && container.nodeType === Node.TEXT_NODE
        ? container.parentElement
        : (container as Element | null);
    return {
      text,
      withinEditor: Boolean(
        ancestor && pm && (pm === ancestor || pm.contains(ancestor)),
      ),
    };
  });

  expect(selection.text).toContain(noteBody);
  expect(selection.withinEditor).toBe(true);
  // The sidebar's workspace name must never land in the selection.
  expect(selection.text).not.toContain(workspaceName);
});
