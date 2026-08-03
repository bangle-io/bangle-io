import { expect, test } from '@playwright/test';
import {
  createBrowserWorkspaceAndNote,
  EDITOR_FOCUSED_SELECTOR,
  getEditorLocator,
  waitForEditorFocus,
} from './common';

const workspaceName = 'select-all-scope';
const noteBody = 'alpha bravo charlie';

// Regression: clicking the empty space under a short note left focus on the
// page body, so Cmd/Ctrl-A ran the browser's document-wide select-all and swept
// the sidebar and app chrome into the selection. Putting the caret back in the
// note on that click keeps select-all where the user is typing, and leaves the
// shortcut itself to the editor.
test('Cmd/Ctrl-A after clicking below the note selects only the note', async ({
  page,
}) => {
  await createBrowserWorkspaceAndNote(page, {
    workspaceName,
    noteName: 'note-a',
  });
  const editor = getEditorLocator(page, {}).first();
  await waitForEditorFocus(page, {});
  await editor.fill(noteBody);
  await expect(editor).toHaveText(noteBody);

  // Click the empty pane below the note, the region a user clicks when the
  // note is short.
  const box = await editor.boundingBox();
  if (!box) {
    throw new Error('Expected the editor to expose a bounding box');
  }
  await page.mouse.click(box.x + box.width / 2, box.y + box.height + 20);

  // The click must hand focus back to the note; that is what keeps the shortcut
  // scoped without the app intercepting it.
  await expect(page.locator(EDITOR_FOCUSED_SELECTOR)).toBeVisible();

  await page.keyboard.press('ControlOrMeta+a');

  const selection = await page.evaluate(() => {
    const pm = document.querySelector('.ProseMirror');
    const sel = window.getSelection();
    const text = sel ? sel.toString() : '';
    const range = sel?.rangeCount ? sel.getRangeAt(0) : null;
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
