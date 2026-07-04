import { expect, type Page, test } from '@playwright/test';
import {
  createBrowserWorkspaceAndNote,
  EDITOR_SELECTOR,
  getEditorLocator,
  readStoredMarkdown,
  writeStoredMarkdown,
} from './common';

const BROWSER_MAX_FILE_SIZE_BYTES = 25 * 1024 * 1024;

const dispatchAssetPasteEvent = (element: Element) => {
  const pngBytes = Uint8Array.from([
    137, 80, 78, 71, 13, 10, 26, 10, 0, 0, 0, 13, 73, 72, 68, 82, 0, 0, 0, 1, 0,
    0, 0, 1, 8, 6, 0, 0, 0, 31, 21, 196, 137, 0, 0, 0, 13, 73, 68, 65, 84, 120,
    156, 99, 248, 15, 4, 0, 9, 251, 3, 253, 167, 186, 48, 251, 0, 0, 0, 0, 73,
    69, 78, 68, 174, 66, 96, 130,
  ]);
  const dataTransfer = new DataTransfer();
  dataTransfer.items.add(
    new File(
      [pngBytes],
      'Extremely Long Image Drop Filename For Toast UX.PNG',
      { type: 'image/png' },
    ),
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
      new File(
        [pngBytes],
        'Extremely Long Image Drop Filename For Toast UX.PNG',
        { type: 'image/png' },
      ),
    );
    dataTransfer.items.add(
      new File(['%PDF-1.4\n'], 'Spec Sheet.PDF', {
        type: 'application/pdf',
      }),
    );
    return dataTransfer;
  });
}

function createOversizedAssetDataTransferHandle(page: Page, size: number) {
  return page.evaluateHandle((fileSize) => {
    const file = new File(['small body'], 'Too Large Archive.zip', {
      type: 'application/zip',
    });
    Object.defineProperty(file, 'size', { value: fileSize });

    const dataTransfer = new DataTransfer();
    dataTransfer.items.add(file);
    return dataTransfer;
  }, size);
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
    .toContain(
      '![Extremely Long Image Drop Filename For Toast UX.PNG](assets/extremely-long-image-drop-filename-for-toast-ux-',
    );
  await expect(
    page.getByText(
      'Saved Extremely Long Image Drop...For Toast UX.PNG + 1 more',
    ),
  ).toBeVisible();
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
    .toContain(
      '![Extremely Long Image Drop Filename For Toast UX.PNG](assets/extremely-long-image-drop-filename-for-toast-ux-',
    );
  await expect(
    page.getByText(
      'Saved Extremely Long Image Drop...For Toast UX.PNG + 1 more',
    ),
  ).toBeVisible();
  const markdown = await readStoredMarkdown(page, workspaceName, noteName);
  expect(markdown).not.toContain('data:');
  expect(markdown).toContain('[Spec Sheet.PDF](assets/spec-sheet-');
  expect(markdown).toContain('.pdf)');
  await expect(editor.locator('img')).toHaveAttribute('src', /^blob:/);

  await page.getByRole('button', { name: 'Open' }).click();
  await expect(
    page.getByRole('heading', {
      name: /extremely-long-image-drop-filename-for-toast-ux-.*\.png/i,
    }),
  ).toBeVisible();
});

test('drops workspace-backed assets at the top edge before existing note content', async ({
  page,
}, testInfo) => {
  const workspaceName = `asset-drop-top-${testInfo.workerIndex}-${Date.now()}`;
  const noteName = 'source';
  await createBrowserWorkspaceAndNote(page, { workspaceName, noteName });
  await writeStoredMarkdown(
    page,
    workspaceName,
    noteName,
    'Existing paragraph',
  );
  await page.reload({ waitUntil: 'networkidle' });

  const editor = getEditorLocator(page, {});
  await expect(editor).toContainText('Existing paragraph');

  const editorBox = await editor.boundingBox();
  if (!editorBox) {
    throw new Error('Expected editor to have a visible bounding box');
  }

  const dataTransfer = await createAssetDataTransferHandle(page);
  await page.locator(EDITOR_SELECTOR).dispatchEvent('drop', {
    clientX: editorBox.x + 4,
    clientY: editorBox.y + 4,
    dataTransfer,
  });
  await dataTransfer.dispose();

  const imageMarkdownPrefix =
    '![Extremely Long Image Drop Filename For Toast UX.PNG](assets/extremely-long-image-drop-filename-for-toast-ux-';
  const linkMarkdownPrefix = '[Spec Sheet.PDF](assets/spec-sheet-';

  await expect
    .poll(() => readStoredMarkdown(page, workspaceName, noteName))
    .toContain(imageMarkdownPrefix);
  const markdown = await readStoredMarkdown(page, workspaceName, noteName);
  if (!markdown) {
    throw new Error('Expected dropped assets to be persisted into Markdown');
  }
  expect(markdown).not.toContain('data:');

  const imageIndex = markdown.indexOf(imageMarkdownPrefix);
  const linkIndex = markdown.indexOf(linkMarkdownPrefix);
  const existingIndex = markdown.indexOf('Existing paragraph');
  expect(imageIndex).toBeGreaterThanOrEqual(0);
  expect(linkIndex).toBeGreaterThanOrEqual(0);
  expect(existingIndex).toBeGreaterThanOrEqual(0);
  expect(imageIndex).toBeLessThan(existingIndex);
  expect(linkIndex).toBeLessThan(existingIndex);
  await expect(editor.locator('img')).toHaveAttribute('src', /^blob:/);
});

test('rejects dropped files larger than the workspace storage provider limit', async ({
  page,
}, testInfo) => {
  const workspaceName = `asset-drop-large-${testInfo.workerIndex}-${Date.now()}`;
  const noteName = 'source';
  await createBrowserWorkspaceAndNote(page, { workspaceName, noteName });

  const editor = getEditorLocator(page, {});
  await editor.click();
  const dataTransfer = await createOversizedAssetDataTransferHandle(
    page,
    BROWSER_MAX_FILE_SIZE_BYTES + 1,
  );
  await page.locator(EDITOR_SELECTOR).dispatchEvent('drop', {
    clientX: 20,
    clientY: 20,
    dataTransfer,
  });
  await dataTransfer.dispose();

  await expect(
    page.getByText(
      'Too Large Archive.zip is too large. Maximum file size is 25 MB.',
    ),
  ).toBeVisible();
  await expect
    .poll(
      async () =>
        (await readStoredMarkdown(page, workspaceName, noteName)) ?? '',
    )
    .not.toContain('Too Large Archive.zip');
  await expect(
    editor.getByRole('link', { name: 'Too Large Archive.zip' }),
  ).toHaveCount(0);
});
