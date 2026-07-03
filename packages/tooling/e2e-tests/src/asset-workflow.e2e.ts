import { expect, type Page, test } from '@playwright/test';
import {
  createBrowserWorkspaceAndNote,
  EDITOR_SELECTOR,
  getEditorLocator,
  readStoredMarkdown,
} from './common';

const dispatchAssetPasteEvent = (element: Element) => {
  const pngBytes = Uint8Array.from([
    137, 80, 78, 71, 13, 10, 26, 10, 0, 0, 0, 13, 73, 72, 68, 82, 0, 0, 0, 1, 0,
    0, 0, 1, 8, 6, 0, 0, 0, 31, 21, 196, 137, 0, 0, 0, 13, 73, 68, 65, 84, 120,
    156, 99, 248, 15, 4, 0, 9, 251, 3, 253, 167, 186, 48, 251, 0, 0, 0, 0, 73,
    69, 78, 68, 174, 66, 96, 130,
  ]);
  const dataTransfer = new DataTransfer();
  dataTransfer.items.add(
    new File([pngBytes], 'Image Drop.PNG', { type: 'image/png' }),
  );
  dataTransfer.items.add(
    new File(['%PDF-1.4\n'], 'Spec Sheet.PDF', {
      type: 'application/pdf',
    }),
  );

  const event = new Event('paste', {
    bubbles: true,
    cancelable: true,
  });
  Object.defineProperty(event, 'clipboardData', { value: dataTransfer });
  element.dispatchEvent(event);
  return event.defaultPrevented;
};

function createAssetDataTransferHandle(page: Page) {
  return page.evaluateHandle(() => {
    const pngBytes = Uint8Array.from([
      137, 80, 78, 71, 13, 10, 26, 10, 0, 0, 0, 13, 73, 72, 68, 82, 0, 0, 0, 1,
      0, 0, 0, 1, 0, 0, 0, 1, 8, 6, 0, 0, 0, 31, 21, 196, 137, 0, 0, 0, 13, 73,
      68, 65, 84, 120, 156, 99, 248, 15, 4, 0, 9, 251, 3, 253, 167, 186, 48,
      251, 0, 0, 0, 0, 73, 69, 78, 68, 174, 66, 96, 130,
    ]);
    const dataTransfer = new DataTransfer();
    dataTransfer.items.add(
      new File([pngBytes], 'Image Drop.PNG', { type: 'image/png' }),
    );
    dataTransfer.items.add(
      new File(['%PDF-1.4\n'], 'Spec Sheet.PDF', {
        type: 'application/pdf',
      }),
    );
    return dataTransfer;
  });
}

test('pastes workspace-backed image and PDF assets, reloads, and opens asset page', async ({
  page,
}, testInfo) => {
  const workspaceName = `asset-workflow-${testInfo.workerIndex}-${Date.now()}`;
  const noteName = 'source';
  await createBrowserWorkspaceAndNote(page, { workspaceName, noteName });

  const editor = getEditorLocator(page, {});
  await editor.click();
  await page.locator(EDITOR_SELECTOR).evaluate(dispatchAssetPasteEvent);

  await expect
    .poll(() => readStoredMarkdown(page, workspaceName, noteName))
    .toContain('![Image Drop.PNG](assets/image-drop-');
  const markdown = await readStoredMarkdown(page, workspaceName, noteName);
  expect(markdown).not.toContain('data:');
  expect(markdown).toContain('[Spec Sheet.PDF](assets/spec-sheet-');
  expect(markdown).toContain('.pdf)');

  await expect(editor.locator('img')).toHaveAttribute('src', /^blob:/);

  await page.reload({ waitUntil: 'networkidle' });
  await expect(editor.locator('img')).toHaveAttribute('src', /^blob:/);
  await expect(
    editor.getByRole('link', { name: 'Spec Sheet.PDF' }),
  ).toBeVisible();

  await editor.getByRole('link', { name: 'Spec Sheet.PDF' }).click();
  await expect(
    page.getByRole('heading', { name: /spec-sheet-.*\.pdf/i }),
  ).toBeVisible();
  await expect(page.getByRole('link', { name: 'Download' })).toHaveAttribute(
    'download',
    /spec-sheet-.*\.pdf/,
  );
});

test('drops workspace-backed image and PDF assets as relative Markdown', async ({
  page,
}, testInfo) => {
  const workspaceName = `asset-drop-${testInfo.workerIndex}-${Date.now()}`;
  const noteName = 'source';
  await createBrowserWorkspaceAndNote(page, { workspaceName, noteName });

  const editor = getEditorLocator(page, {});
  await editor.click();
  const dataTransfer = await createAssetDataTransferHandle(page);
  await page.locator(EDITOR_SELECTOR).dispatchEvent('drop', {
    clientX: 20,
    clientY: 20,
    dataTransfer,
  });
  await dataTransfer.dispose();

  await expect
    .poll(() => readStoredMarkdown(page, workspaceName, noteName))
    .toContain('![Image Drop.PNG](assets/image-drop-');
  const markdown = await readStoredMarkdown(page, workspaceName, noteName);
  expect(markdown).not.toContain('data:');
  expect(markdown).toContain('[Spec Sheet.PDF](assets/spec-sheet-');
  expect(markdown).toContain('.pdf)');
  await expect(editor.locator('img')).toHaveAttribute('src', /^blob:/);
});
