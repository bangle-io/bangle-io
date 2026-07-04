import { expect, type Locator, type Page, test } from '@playwright/test';
import {
  createBrowserWorkspaceAndNote,
  ctrlKey,
  EDITOR_SELECTOR,
  getEditorLocator,
  readStoredMarkdown,
  selectEditorText,
  writeStoredFile,
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

const dispatchTextPasteEvent = (element: Element, text: string) => {
  const dataTransfer = new DataTransfer();
  dataTransfer.setData('text/plain', text);

  const event = new Event('paste', {
    bubbles: true,
    cancelable: true,
  });
  Object.defineProperty(event, 'clipboardData', { value: dataTransfer });
  element.dispatchEvent(event);
  return event.defaultPrevented;
};

const dispatchPdfPasteEvent = (element: Element) => {
  const dataTransfer = new DataTransfer();
  dataTransfer.items.add(
    new File(['%PDF-1.4\n'], 'Replacement.PDF', {
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

function createTextDataTransferHandle(page: Page, text: string) {
  return page.evaluateHandle((value) => {
    const dataTransfer = new DataTransfer();
    dataTransfer.setData('text/plain', value);
    return dataTransfer;
  }, text);
}

// The file tree starts its real drag session from native mouse movement, and
// that path is what guards against opening the row while dragging.
async function dragTreeItemOntoEditor(
  page: Page,
  source: Locator,
  editor: Locator,
) {
  const sourceBox = await source.boundingBox();
  const editorBox = await editor.boundingBox();

  if (!sourceBox || !editorBox) {
    throw new Error('Expected drag source and editor target to be visible');
  }

  const sourceX = sourceBox.x + sourceBox.width / 2;
  const sourceY = sourceBox.y + sourceBox.height / 2;
  const targetX = editorBox.x + Math.min(40, editorBox.width / 2);
  const targetY = editorBox.y + Math.min(40, editorBox.height / 2);
  const settleFrame = () => page.waitForTimeout(60);

  await page.mouse.move(sourceX, sourceY);
  await page.mouse.down();
  await settleFrame();
  await page.mouse.move(sourceX + 12, sourceY);
  await settleFrame();
  await page.mouse.move((sourceX + targetX) / 2, (sourceY + targetY) / 2);
  await settleFrame();
  await page.mouse.move(targetX, targetY);
  await settleFrame();
  await page.mouse.move(targetX, targetY);
  await settleFrame();
  await page.mouse.up();
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

test('pasting a workspace asset replaces selected editor text', async ({
  page,
}, testInfo) => {
  const workspaceName = `asset-paste-selection-${testInfo.workerIndex}-${Date.now()}`;
  const noteName = 'source';
  await createBrowserWorkspaceAndNote(page, { workspaceName, noteName });

  const editor = getEditorLocator(page, {});
  await editor.click();
  await page.keyboard.type('Keep replace-me suffix');
  await selectEditorText(page, 'replace-me');
  await page.locator(EDITOR_SELECTOR).evaluate(dispatchPdfPasteEvent);

  await expect
    .poll(() => readStoredMarkdown(page, workspaceName, noteName))
    .toMatch(
      /^Keep \[Replacement\.PDF\]\(assets\/replacement-.*\.pdf\) suffix$/,
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

test('copies workspace paths and smart-links pasted or dropped existing assets', async ({
  context,
  page,
}, testInfo) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write']);
  const workspaceName = `asset-path-link-${testInfo.workerIndex}-${Date.now()}`;
  const noteName = 'source';
  await createBrowserWorkspaceAndNote(page, { workspaceName, noteName });
  await writeStoredFile(
    page,
    workspaceName,
    'assets/photo.png',
    'png bytes',
    'image/png',
  );
  await writeStoredFile(
    page,
    workspaceName,
    'assets/report.pdf',
    '%PDF-1.4',
    'application/pdf',
  );
  await page.reload({ waitUntil: 'networkidle' });

  const explorer = page.getByTestId('bangle-file-explorer');
  await expect(
    explorer.getByRole('treeitem', { name: /^assets$/ }),
  ).toBeVisible();
  const photoRow = explorer.getByRole('treeitem', { name: /photo\.png/ });
  await expect(photoRow).toBeVisible();
  await photoRow.click({ button: 'right' });
  await page.getByRole('button', { name: 'Copy path' }).click();
  await expect(page.getByText('Path copied')).toBeVisible();
  await expect
    .poll(() => page.evaluate(() => navigator.clipboard.readText()))
    .toBe('assets/photo.png');

  const editor = getEditorLocator(page, {});
  await editor.click();
  await page
    .locator(EDITOR_SELECTOR)
    .evaluate(dispatchTextPasteEvent, 'assets/photo.png');
  await expect
    .poll(() => readStoredMarkdown(page, workspaceName, noteName))
    .toContain('![photo.png](assets/photo.png)');
  await expect(editor.locator('img[alt="photo.png"]')).toHaveAttribute(
    'src',
    /^blob:/,
  );

  await editor.press(`${ctrlKey}+Z`);
  await expect
    .poll(
      async () =>
        (await readStoredMarkdown(page, workspaceName, noteName)) ?? '',
    )
    .toBe('assets/photo.png');
  await expect(editor.locator('img[alt="photo.png"]')).toHaveCount(0);

  await page.evaluate(() => navigator.clipboard.writeText('assets/report.pdf'));
  await editor.click();
  await page
    .locator(EDITOR_SELECTOR)
    .evaluate(dispatchTextPasteEvent, 'assets/report.pdf');
  await expect
    .poll(() => readStoredMarkdown(page, workspaceName, noteName))
    .toContain('[report.pdf](assets/report.pdf)');
  await expect(editor.getByRole('link', { name: 'report.pdf' })).toBeVisible();

  await editor.press(`${ctrlKey}+Z`);
  await expect
    .poll(
      async () =>
        (await readStoredMarkdown(page, workspaceName, noteName)) ?? '',
    )
    .toBe('assets/photo.pngassets/report.pdf');

  const editorBox = await editor.boundingBox();
  if (!editorBox) {
    throw new Error('Expected editor to have a visible bounding box');
  }
  const dataTransfer = await createTextDataTransferHandle(
    page,
    'assets/photo.png',
  );
  await page.locator(EDITOR_SELECTOR).dispatchEvent('drop', {
    clientX: editorBox.x + 4,
    clientY: editorBox.y + 4,
    dataTransfer,
  });
  await dataTransfer.dispose();

  await expect
    .poll(() => readStoredMarkdown(page, workspaceName, noteName))
    .toContain('![photo.png](assets/photo.png)');
  await expect(editor.locator('img[alt="photo.png"]')).toHaveAttribute(
    'src',
    /^blob:/,
  );
});

test('drags existing sidebar assets into the editor as smart Markdown links', async ({
  page,
}, testInfo) => {
  const workspaceName = `asset-sidebar-drag-${testInfo.workerIndex}-${Date.now()}`;
  const noteName = 'source';
  await createBrowserWorkspaceAndNote(page, { workspaceName, noteName });
  await writeStoredFile(
    page,
    workspaceName,
    'assets/photo.png',
    'png bytes',
    'image/png',
  );
  await writeStoredFile(
    page,
    workspaceName,
    'assets/report.pdf',
    '%PDF-1.4',
    'application/pdf',
  );
  await page.reload({ waitUntil: 'networkidle' });

  const explorer = page.getByTestId('bangle-file-explorer');
  const editor = getEditorLocator(page, {});
  await expect(editor).toBeVisible();
  const editorRoute = page.url();

  const photoRow = explorer.getByRole('treeitem', { name: /photo\.png/ });
  await expect(photoRow).toBeVisible();
  await dragTreeItemOntoEditor(page, photoRow, editor);
  await expect
    .poll(() => readStoredMarkdown(page, workspaceName, noteName))
    .toContain('![photo.png](assets/photo.png)');
  await expect(editor.locator('img[alt="photo.png"]')).toHaveAttribute(
    'src',
    /^blob:/,
  );
  expect(page.url()).toBe(editorRoute);

  const reportRow = explorer.getByRole('treeitem', { name: /report\.pdf/ });
  await expect(reportRow).toBeVisible();
  await dragTreeItemOntoEditor(page, reportRow, editor);
  await expect
    .poll(() => readStoredMarkdown(page, workspaceName, noteName))
    .toContain('[report.pdf](assets/report.pdf)');
  await expect(editor.getByRole('link', { name: 'report.pdf' })).toBeVisible();
  expect(page.url()).toBe(editorRoute);
});

test('copied nested workspace paths paste and drop from another note', async ({
  context,
  page,
}, testInfo) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write']);
  const workspaceName = `asset-nested-path-${testInfo.workerIndex}-${Date.now()}`;
  await createBrowserWorkspaceAndNote(page, {
    workspaceName,
    noteName: 'AGENTS',
  });
  await writeStoredMarkdown(
    page,
    workspaceName,
    'docs/getting-started/codex-prerequisites',
    'Codex prerequisites',
  );
  await writeStoredMarkdown(
    page,
    workspaceName,
    'docs/getting-started/quick-start',
    '',
  );
  await writeStoredMarkdown(page, workspaceName, 'docs/README', 'Docs');
  await page.reload({ waitUntil: 'networkidle' });

  const explorer = page.getByTestId('bangle-file-explorer');
  const docsFolder = explorer.getByRole('treeitem', { name: /^docs$/ });
  await expect(docsFolder).toBeVisible();
  await docsFolder.focus();
  await page.keyboard.press('ArrowRight');
  const gettingStartedFolder = explorer.getByRole('treeitem', {
    name: /^getting-started$/,
  });
  await expect(gettingStartedFolder).toBeVisible();
  await gettingStartedFolder.focus();
  await page.keyboard.press('ArrowRight');

  const prerequisiteRow = explorer.getByRole('treeitem', {
    name: /codex-prerequisites\.md/,
  });
  await expect(prerequisiteRow).toBeVisible();
  await prerequisiteRow.click({ button: 'right' });
  await page.getByRole('button', { name: 'Copy path' }).click();
  await expect
    .poll(() => page.evaluate(() => navigator.clipboard.readText()))
    .toBe('docs/getting-started/codex-prerequisites.md');

  await page.goto(
    `/ws#route=editor&wsPath=${encodeURIComponent(
      `${workspaceName}:docs/getting-started/quick-start.md`,
    )}`,
  );
  const editor = getEditorLocator(page, {});
  await expect(editor).toBeVisible();
  await editor.click();
  await page
    .locator(EDITOR_SELECTOR)
    .evaluate(
      dispatchTextPasteEvent,
      'docs/getting-started/codex-prerequisites.md',
    );
  await expect
    .poll(() =>
      readStoredMarkdown(
        page,
        workspaceName,
        'docs/getting-started/quick-start',
      ),
    )
    .toContain('[codex-prerequisites.md](codex-prerequisites.md)');

  await editor.press(`${ctrlKey}+Z`);
  await expect
    .poll(() =>
      readStoredMarkdown(
        page,
        workspaceName,
        'docs/getting-started/quick-start',
      ),
    )
    .toBe('docs/getting-started/codex-prerequisites.md');

  await editor.press(`${ctrlKey}+A`);
  await editor.press('Backspace');
  await expect
    .poll(() =>
      readStoredMarkdown(
        page,
        workspaceName,
        'docs/getting-started/quick-start',
      ),
    )
    .toBe('');

  const editorBox = await editor.boundingBox();
  if (!editorBox) {
    throw new Error('Expected editor to have a visible bounding box');
  }
  const dataTransfer = await createTextDataTransferHandle(
    page,
    'docs/getting-started/codex-prerequisites.md',
  );
  await page.locator(EDITOR_SELECTOR).dispatchEvent('drop', {
    clientX: editorBox.x + 4,
    clientY: editorBox.y + 4,
    dataTransfer,
  });
  await dataTransfer.dispose();
  await expect
    .poll(() =>
      readStoredMarkdown(
        page,
        workspaceName,
        'docs/getting-started/quick-start',
      ),
    )
    .toContain('[codex-prerequisites.md](codex-prerequisites.md)');
});
