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

// Regression: a math node opens a nested EditorView for its LaTeX source.
// `view.hasFocus()` is an identity check on the outer contenteditable, so it
// reported false while the nested editor held focus. The shortcut treated that
// as "unfocused", stole focus out of the math editor and selected the whole
// note — so the next keystroke replaced the entire document.
test('Cmd/Ctrl-A inside a math node does not select or destroy the note', async ({
  page,
}) => {
  await createBrowserWorkspaceAndNote(page, {
    workspaceName: 'select-all-math',
    noteName: 'note-math',
  });
  // The math node mounts its own nested `.ProseMirror`, so scope to the outer
  // editor explicitly rather than letting the shared locator match both.
  const editor = getEditorLocator(page, {}).first();
  await waitForEditorFocus(page, {});
  await page.keyboard.type('KEEP THIS LINE');
  await page.keyboard.press('Enter');

  // Insert a math block and type into its nested source editor.
  await page.keyboard.type('/math');
  await expect(page.getByRole('option', { name: /Math block/i })).toBeVisible();
  await page.keyboard.press('Enter');
  const mathSource = editor.locator('.math-src .ProseMirror');
  await expect(mathSource).toBeVisible();
  await page.keyboard.type('\\frac{a}{b}');

  // The nested editor owns focus, so select-all belongs to it, not the note.
  // (Focus is asserted by containment: the outer editor and the math source are
  // both `.ProseMirror`, so a focused-class selector would match either one.)
  await pressAppShortcut(page, 'a');
  await expect(mathSource).toBeVisible();
  await expect
    .poll(() =>
      page.evaluate(() => {
        const source = document.querySelector('.math-src');
        const active = document.activeElement;
        return Boolean(source && active && source.contains(active));
      }),
    )
    .toBe(true);

  // The decisive assertion: a keystroke after select-all must not wipe the note.
  await page.keyboard.type('X');
  await expect(editor).toContainText('KEEP THIS LINE');
});

// Regression: the shortcut must not steal focus from a control elsewhere in the
// app. A focused text input keeps its own select-all.
test('Cmd/Ctrl-A leaves an app text input in control of select-all', async ({
  page,
}) => {
  await createBrowserWorkspaceAndNote(page, {
    workspaceName: 'select-all-input',
    noteName: 'note-input',
  });
  await waitForEditorFocus(page, {});
  await page.keyboard.type(noteBody);

  await pressAppShortcut(page, 'k');
  const omniInput = page.getByPlaceholder(/Type a command or search/i);
  await expect(omniInput).toBeVisible();
  await omniInput.click();
  await omniInput.fill('hello world');

  await pressAppShortcut(page, 'a');

  // Focus stays in the input and the editor is not selected behind the dialog.
  await expect(omniInput).toBeFocused();
  await expect(page.locator(EDITOR_FOCUSED_SELECTOR)).toBeHidden();
});
