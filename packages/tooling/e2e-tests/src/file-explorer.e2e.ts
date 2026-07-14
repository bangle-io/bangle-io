import { expect, type Locator, type Page, test } from '@playwright/test';
import {
  clearEditor,
  createBrowserWorkspace,
  dragTreeItemOnto,
  expandFileTreeFolder,
  expectNoPageHorizontalOverflow,
  getEditorLocator,
  getEditorText,
  readStoredMarkdown,
  writeStoredFile,
  writeStoredMarkdown,
} from './common';

async function expectContextMenuIsNotClipped(page: Page) {
  const menu = page.locator('[data-file-tree-context-menu-root="true"]');

  await expect(menu).toBeVisible();
  await expect
    .poll(
      () =>
        menu.evaluate((element) => {
          const rect = element.getBoundingClientRect();
          const viewportWidth = document.documentElement.clientWidth;
          const viewportHeight = document.documentElement.clientHeight;
          const samplePoints: Array<readonly [number, number]> = [
            [rect.left + rect.width / 2, rect.top + rect.height / 2],
            [rect.right - 4, rect.top + rect.height / 2],
            [rect.left + rect.width / 2, rect.bottom - 4],
          ];

          return (
            rect.left >= 0 &&
            rect.top >= 0 &&
            rect.right <= viewportWidth &&
            rect.bottom <= viewportHeight &&
            samplePoints.every(([x, y]) => {
              const hit = document.elementFromPoint(x, y);
              return hit ? element.contains(hit) : false;
            })
          );
        }),
      { message: 'Expected the file-tree context menu to be fully hittable' },
    )
    .toBe(true);
}

async function getFileExplorerLayout(page: Page) {
  return page.getByTestId('bangle-file-explorer').evaluate((explorer) => {
    const host = explorer.querySelector('file-tree-container') as HTMLElement;
    const scroll = host.shadowRoot?.querySelector(
      '[data-file-tree-virtualized-scroll="true"]',
    ) as HTMLElement | null;
    const footer = explorer
      .closest('[data-sidebar="sidebar"]')
      ?.querySelector('[data-sidebar="footer"]') as HTMLElement | null;
    const explorerRect = explorer.getBoundingClientRect();
    const hostRect = host.getBoundingClientRect();
    const scrollRect = scroll?.getBoundingClientRect();
    const footerRect = footer?.getBoundingClientRect();

    return {
      explorerBottom: explorerRect.bottom,
      explorerHeight: explorerRect.height,
      footerTop: footerRect?.top ?? window.innerHeight,
      hostRight: hostRect.right,
      scrollClientHeight: scroll?.clientHeight ?? 0,
      scrollHeight: scroll?.scrollHeight ?? 0,
      scrollRight: scrollRect?.right ?? 0,
      scrollTop: scroll?.scrollTop ?? 0,
    };
  });
}

async function setFileExplorerScrollTop(page: Page, scrollTop: number) {
  await page
    .getByTestId('bangle-file-explorer')
    .evaluate((explorer, nextScrollTop) => {
      const host = explorer.querySelector('file-tree-container') as HTMLElement;
      const scroll = host.shadowRoot?.querySelector(
        '[data-file-tree-virtualized-scroll="true"]',
      ) as HTMLElement | null;

      if (!scroll) {
        throw new Error('Expected Pierre file tree scroll container');
      }

      scroll.scrollTop = nextScrollTop;
    }, scrollTop);
}

async function expectFileTreeItemInViewport(item: Locator) {
  await expect
    .poll(() =>
      item.evaluate((element) => {
        const root = element.getRootNode();
        if (!(root instanceof ShadowRoot)) {
          return false;
        }

        const scroll = root.querySelector<HTMLElement>(
          '[data-file-tree-virtualized-scroll="true"]',
        );
        if (!scroll) {
          return false;
        }

        const itemRect = element.getBoundingClientRect();
        const scrollRect = scroll.getBoundingClientRect();
        return (
          itemRect.top >= scrollRect.top && itemRect.bottom <= scrollRect.bottom
        );
      }),
    )
    .toBe(true);
}

async function readPersistedExpandedPaths(
  page: Page,
  workspaceName: string,
): Promise<readonly string[] | undefined> {
  return page.evaluate((name) => {
    const stored = window.localStorage.getItem(
      'browser-local-storage-sync-database.sync:workbench-state:file-tree-expanded-paths-by-workspace',
    );
    if (!stored) {
      return undefined;
    }

    const pathsByWorkspace = JSON.parse(stored) as Record<
      string,
      readonly string[]
    >;
    return pathsByWorkspace[name];
  }, workspaceName);
}

async function readStoredFileText(
  page: Page,
  workspaceName: string,
  relativePath: string,
): Promise<string | undefined> {
  return page.evaluate(
    async ({ filePath, workspace }) => {
      const request = indexedDB.open('baby-idb-db-3');
      const database = await new Promise<IDBDatabase>((resolve, reject) => {
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      });
      const transaction = database.transaction(
        'baby-idb-db-store-3',
        'readonly',
      );
      const getRequest = transaction
        .objectStore('baby-idb-db-store-3')
        .get(`${workspace}/${filePath}`);
      const file = await new Promise<File | undefined>((resolve, reject) => {
        getRequest.onsuccess = () => resolve(getRequest.result);
        getRequest.onerror = () => reject(getRequest.error);
      });
      database.close();
      return file?.text();
    },
    { filePath: relativePath, workspace: workspaceName },
  );
}

async function clickVisibleFileTreeRow(page: Page) {
  return page.getByTestId('bangle-file-explorer').evaluate((explorer) => {
    const host = explorer.querySelector('file-tree-container') as HTMLElement;
    const root = host.shadowRoot;
    const scroll = root?.querySelector(
      '[data-file-tree-virtualized-scroll="true"]',
    ) as HTMLElement | null;

    if (!root || !scroll) {
      throw new Error('Expected Pierre file tree shadow root');
    }

    const scrollRect = scroll.getBoundingClientRect();
    const row = Array.from(
      root.querySelectorAll('button[data-type="item"][data-item-type="file"]'),
    ).find((element) => {
      const rect = element.getBoundingClientRect();

      return (
        rect.top > scrollRect.top + 16 && rect.bottom < scrollRect.bottom - 16
      );
    }) as HTMLElement | undefined;

    if (!row) {
      throw new Error('Expected a visible file row to click');
    }

    const label = row.getAttribute('aria-label') ?? '';
    const noteIndex = /^note-(\d+)\.md$/.exec(label)?.[1];
    row.click();

    return {
      expectedText: noteIndex === undefined ? '' : `Note ${Number(noteIndex)}`,
      label: row.getAttribute('aria-label') ?? '',
    };
  });
}

async function writeStoredFiles(
  page: Page,
  workspaceName: string,
  files: Array<{ content: string; relativePath: string; type: string }>,
) {
  await page.evaluate(
    async ({ workspace, files }) => {
      const request = indexedDB.open('baby-idb-db-3');
      const database = await new Promise<IDBDatabase>((resolve, reject) => {
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      });

      await new Promise<void>((resolve, reject) => {
        const transaction = database.transaction(
          'baby-idb-db-store-3',
          'readwrite',
        );
        transaction.oncomplete = () => resolve();
        transaction.onerror = () => reject(transaction.error);
        transaction.onabort = () => reject(transaction.error);

        const store = transaction.objectStore('baby-idb-db-store-3');
        for (const file of files) {
          store.put(
            new File(
              [file.content],
              file.relativePath.split('/').at(-1) ?? file.relativePath,
              {
                type: file.type,
              },
            ),
            `${workspace}/${file.relativePath}`,
          );
        }
      });
      database.close();
    },
    { files, workspace: workspaceName },
  );
}

test('file explorer collapse-all preserves user expansion until invoked', async ({
  page,
}) => {
  const workspaceName = `explorer-collapse-all-${Date.now()}`;
  await createBrowserWorkspace(page, { workspaceName });
  await writeStoredMarkdown(
    page,
    workspaceName,
    'z-active/branch/current',
    'Current note\n\n[[hidden]]',
  );
  await writeStoredMarkdown(
    page,
    workspaceName,
    'z-active/sibling',
    'Active sibling',
  );
  await writeStoredMarkdown(
    page,
    workspaceName,
    'a-other/deep/hidden',
    'Other note',
  );
  await writeStoredMarkdown(
    page,
    workspaceName,
    'a-other/root',
    'Other root note',
  );
  await writeStoredFiles(
    page,
    workspaceName,
    Array.from({ length: 24 }, (_, index) => ({
      content: `Bulk note ${index}`,
      relativePath: `bulk-${String(index).padStart(2, '0')}/deep/note.md`,
      type: 'text/markdown',
    })),
  );

  await page.goto(
    `/ws#route=editor&wsPath=${encodeURIComponent(
      `${workspaceName}:z-active/branch/current.md`,
    )}`,
  );
  await page.reload();

  const explorer = page.getByTestId('bangle-file-explorer');
  const activeFolder = explorer.getByRole('treeitem', { name: /^z-active$/ });
  const branchFolder = explorer.getByRole('treeitem', { name: /^branch$/ });
  const otherFolder = explorer.getByRole('treeitem', { name: /^a-other$/ });
  const currentNote = explorer.getByRole('treeitem', {
    name: /^current\.md$/,
  });

  await test.step('starts collapsed while preserving and revealing the active note path', async () => {
    await expect(
      explorer.getByRole('button', { name: 'Collapse All Folders' }),
    ).toBeVisible();
    await expect(activeFolder).toHaveAttribute('aria-expanded', 'true');
    await expect(branchFolder).toHaveAttribute('aria-expanded', 'true');
    await expect(currentNote).toBeVisible();
    await expectFileTreeItemInViewport(currentNote);

    await setFileExplorerScrollTop(page, 0);
    await expect(otherFolder).toHaveAttribute('aria-expanded', 'false');
  });

  const muddiedFolder = explorer.getByRole('treeitem', {
    name: /^bulk-00 \/ deep$/,
  });
  await muddiedFolder.focus();
  await page.keyboard.press('ArrowRight');
  await expect(muddiedFolder).toHaveAttribute('aria-expanded', 'true');
  await expectFileTreeItemInViewport(muddiedFolder);

  await test.step('backlink navigation opens its ancestors without collapsing user-expanded folders', async () => {
    await getEditorLocator(page, {})
      .getByRole('link', { name: 'hidden', exact: true })
      .click();
    await expect(page).toHaveURL(
      new RegExp(
        `ws#route=editor&wsPath=${encodeURIComponent(
          `${workspaceName}:a-other/deep/hidden.md`,
        )}$`,
      ),
    );

    const hiddenNote = explorer.getByRole('treeitem', {
      name: /^hidden\.md$/,
    });
    await expect(hiddenNote).toBeVisible();
    await expectFileTreeItemInViewport(hiddenNote);
    await expect(muddiedFolder).toHaveAttribute('aria-expanded', 'true');
  });

  await test.step('persists manual expansion across reload', async () => {
    await expect
      .poll(() =>
        page.evaluate(() =>
          window.localStorage.getItem(
            'browser-local-storage-sync-database.sync:workbench-state:file-tree-expanded-paths-by-workspace',
          ),
        ),
      )
      .toContain('bulk-00/deep');
    await page.reload();
    await expect(muddiedFolder).toHaveAttribute('aria-expanded', 'true');
  });

  await explorer.getByRole('button', { name: 'Collapse All Folders' }).click();

  const hiddenNote = explorer.getByRole('treeitem', { name: /^hidden\.md$/ });
  await expect(hiddenNote).toBeVisible();
  await expectFileTreeItemInViewport(hiddenNote);
  await expect(muddiedFolder).toHaveAttribute('aria-expanded', 'false');

  await test.step('persists the collapse-all result across reload', async () => {
    await page.reload();
    await expect(
      explorer.getByRole('button', { name: 'Collapse All Folders' }),
    ).toBeVisible();
    await expect(hiddenNote).toBeVisible();
    await expectFileTreeItemInViewport(hiddenNote);
    await expect(muddiedFolder).toHaveAttribute('aria-expanded', 'false');
  });
});

test('collapse-all persistence does not bounce between tabs', async ({
  page,
}) => {
  const workspaceName = `explorer-collapse-cross-tab-${Date.now()}`;
  await createBrowserWorkspace(page, { workspaceName });
  await writeStoredMarkdown(
    page,
    workspaceName,
    'a-active/current',
    'First active note',
  );
  await writeStoredMarkdown(
    page,
    workspaceName,
    'b-active/current',
    'Second active note',
  );

  await page.goto(
    `/ws#route=editor&wsPath=${encodeURIComponent(
      `${workspaceName}:a-active/current.md`,
    )}`,
  );
  await page.reload();
  const secondPage = await page.context().newPage();
  await secondPage.goto(
    `/ws#route=editor&wsPath=${encodeURIComponent(
      `${workspaceName}:b-active/current.md`,
    )}`,
  );

  const firstExplorer = page.getByTestId('bangle-file-explorer');
  const secondExplorer = secondPage.getByTestId('bangle-file-explorer');
  const firstPageOtherFolder = firstExplorer.getByRole('treeitem', {
    name: /^b-active$/,
  });
  const secondPageOtherFolder = secondExplorer.getByRole('treeitem', {
    name: /^a-active$/,
  });

  await expect(firstPageOtherFolder).toHaveAttribute('aria-expanded', 'true');
  await secondExplorer
    .getByRole('button', { name: 'Collapse All Folders' })
    .click();
  await expect(secondPageOtherFolder).toHaveAttribute('aria-expanded', 'false');

  await firstExplorer
    .getByRole('button', { name: 'Collapse All Folders' })
    .click();
  await expect(secondPageOtherFolder).toHaveAttribute('aria-expanded', 'true');
  await expect
    .poll(() => readPersistedExpandedPaths(page, workspaceName))
    .toEqual(['a-active']);

  await page.reload();
  await expect(
    firstExplorer.getByRole('treeitem', { name: /^a-active$/ }),
  ).toHaveAttribute('aria-expanded', 'true');
  await expect(firstPageOtherFolder).toHaveAttribute('aria-expanded', 'false');

  await secondPage.close();
});

test('collapse-all supports a prototype-key workspace name', async ({
  page,
}) => {
  const workspaceName = 'constructor';
  await createBrowserWorkspace(page, { workspaceName });
  await writeStoredMarkdown(page, workspaceName, 'active/current', 'Current');
  await writeStoredMarkdown(page, workspaceName, 'other/note', 'Other');

  await page.goto(
    `/ws#route=editor&wsPath=${encodeURIComponent(
      `${workspaceName}:active/current.md`,
    )}`,
  );
  await page.reload();

  const explorer = page.getByTestId('bangle-file-explorer');
  const activeFolder = explorer.getByRole('treeitem', { name: /^active$/ });
  const otherFolder = explorer.getByRole('treeitem', { name: /^other$/ });

  await expect(activeFolder).toHaveAttribute('aria-expanded', 'true');
  await expandFileTreeFolder(page, /^other$/);

  await explorer.getByRole('button', { name: 'Collapse All Folders' }).click();

  await expect(activeFolder).toHaveAttribute('aria-expanded', 'true');
  await expect(otherFolder).toHaveAttribute('aria-expanded', 'false');
});

test('file explorer creates folders, opens notes, and survives reload', async ({
  page,
}) => {
  const workspaceName = `explorer-${Date.now()}`;
  await createBrowserWorkspace(page, { workspaceName });

  const explorer = page.getByTestId('bangle-file-explorer');
  await expect(explorer).toBeVisible();

  await test.step('use the app-level search instead of a duplicate explorer search', async () => {
    await expect(explorer.getByLabel('Search Files')).toHaveCount(0);
    await expect(explorer.getByPlaceholder('Search…')).toHaveCount(0);
  });

  await test.step('create a folder from the explorer root action', async () => {
    await explorer.getByLabel('New Folder').click();
    await page.getByLabel('Folder name').fill('docs');
    await page.getByRole('button', { name: 'Create' }).click();

    await expect(
      page
        .getByLabel('breadcrumb')
        .getByRole('button', { name: 'untitled-1.md' }),
    ).toBeVisible();
  });

  await test.step('create a named nested note through the existing dialog', async () => {
    await page.getByRole('button', { name: 'Bangle.io' }).click();
    await page.getByRole('menuitem', { name: 'New Note' }).click();
    await page.getByLabel('Note name').fill('docs/alpha');
    await page.getByRole('button', { name: 'Create' }).click();

    const editor = getEditorLocator(page, {});
    await expect(editor).toBeVisible();
    await editor.click();
    await clearEditor(page, {});
    await editor.pressSequentially('Alpha explorer content', { delay: 10 });
    await expect
      .poll(() => getEditorText(page, {}))
      .toBe('Alpha explorer content');
  });

  await test.step('create a sibling note from the directory context menu', async () => {
    await explorer.getByRole('treeitem', { name: /^docs$/ }).focus();
    await page.keyboard.press('Shift+F10');
    await page.getByRole('button', { name: 'New Note Here' }).click();

    await expect(
      page
        .getByLabel('breadcrumb')
        .getByRole('button', { name: 'untitled-2.md' }),
    ).toBeVisible();
  });

  await test.step('find and open a note through app-level search', async () => {
    await page.getByRole('button', { name: /Search/ }).click();
    const commandDialog = page.getByRole('dialog', {
      name: 'omni command bar',
    });
    await expect(commandDialog).toBeVisible();

    await commandDialog
      .getByPlaceholder('Type a command or search...')
      .fill('alpha');
    await expect(
      commandDialog.getByRole('option', { name: 'docs/alpha.md' }),
    ).toBeVisible();
    await page.keyboard.press('Enter');

    await expect(commandDialog).toBeHidden();
    await expect(
      page.getByLabel('breadcrumb').getByRole('button', { name: 'alpha.md' }),
    ).toBeVisible();
    await expect
      .poll(() => getEditorText(page, {}))
      .toBe('Alpha explorer content');
  });

  await test.step('create a second root folder for drag-and-drop moves', async () => {
    await explorer.getByLabel('New Folder').click();
    await page.getByLabel('Folder name').fill('archive.v1');
    await page.getByRole('button', { name: 'Create' }).click();

    await expect(
      explorer.getByRole('treeitem', { name: /^archive\.v1$/ }),
    ).toBeVisible();
  });

  await test.step('three-dot file menu is fully visible and hittable', async () => {
    await expandFileTreeFolder(page, /^docs$/);
    const alphaRow = explorer.getByRole('treeitem', { name: /alpha\.md/ });

    await alphaRow.hover();
    await explorer.getByRole('button', { name: 'Options' }).click();
    await expectContextMenuIsNotClipped(page);
    await page.keyboard.press('Escape');
  });

  await test.step('open the named note from the explorer', async () => {
    await explorer.getByRole('treeitem', { name: /alpha\.md/ }).click();

    await expect(
      page.getByLabel('breadcrumb').getByRole('button', { name: 'alpha.md' }),
    ).toBeVisible();
    await expect
      .poll(() => getEditorText(page, {}))
      .toBe('Alpha explorer content');
  });

  await test.step('drag a note into another folder', async () => {
    const source = explorer.getByRole('treeitem', { name: 'alpha.md' });
    const target = explorer.getByRole('treeitem', { name: /^archive\.v1$/ });

    await expect(source).toBeVisible();
    await expect(target).toBeVisible();
    await source.dragTo(target);

    await expect
      .poll(() => readStoredMarkdown(page, workspaceName, 'archive.v1/alpha'))
      .toBe('Alpha explorer content');
  });

  await test.step('right-click folder rename moves every child note', async () => {
    await explorer
      .getByRole('treeitem', { name: /^archive\.v1$/ })
      .click({ button: 'right' });
    await page.getByRole('button', { name: 'Rename' }).click();
    await page.getByPlaceholder('Provide a new folder name').fill('vault.v2');
    await page.getByRole('button', { name: 'Confirm folder rename' }).click();

    await expect
      .poll(() => readStoredMarkdown(page, workspaceName, 'vault.v2/alpha'))
      .toBe('Alpha explorer content');
    await expect
      .poll(() => readStoredMarkdown(page, workspaceName, 'archive.v1/alpha'))
      .toBeUndefined();
  });

  await test.step('right-click rename and delete file operations work', async () => {
    await explorer
      .getByRole('treeitem', { name: /alpha\.md/ })
      .click({ button: 'right' });
    await page.getByRole('button', { name: 'Rename' }).click();
    await page.getByLabel('New name').fill('beta');
    await page
      .getByRole('dialog')
      .getByRole('button', { name: 'Rename' })
      .click();

    await expect
      .poll(() => readStoredMarkdown(page, workspaceName, 'vault.v2/beta'))
      .toBe('Alpha explorer content');

    await explorer
      .getByRole('treeitem', { name: /beta\.md/ })
      .click({ button: 'right' });
    await page.getByRole('button', { name: 'Delete' }).click();
    const confirmDeleteDialog = page.getByRole('alertdialog', {
      name: 'Confirm Delete',
    });
    await expect(confirmDeleteDialog).toBeVisible();
    await confirmDeleteDialog.getByRole('button', { name: 'Delete' }).click();

    await expect
      .poll(() => readStoredMarkdown(page, workspaceName, 'vault.v2/beta'))
      .toBeUndefined();
  });

  await test.step('right-click folder delete removes contained notes', async () => {
    await explorer
      .getByRole('treeitem', { name: /^vault\.v2$/ })
      .click({ button: 'right' });
    await page.getByRole('button', { name: 'Delete' }).click();
    const confirmDeleteDialog = page.getByRole('alertdialog', {
      name: 'Confirm Delete',
    });
    await expect(confirmDeleteDialog).toBeVisible();
    await confirmDeleteDialog
      .getByRole('button', { name: 'Delete Folder' })
      .click();

    await expect
      .poll(() =>
        readStoredMarkdown(page, workspaceName, 'vault.v2/untitled-3'),
      )
      .toBeUndefined();
    await expect(
      explorer.getByRole('treeitem', { name: /^vault\.v2$/ }),
    ).toBeHidden();
  });

  await test.step('reload preserves the remaining explorer state', async () => {
    await page.reload();

    await expect(
      explorer.getByRole('treeitem', { name: /^docs$/ }),
    ).toBeVisible();
    await expandFileTreeFolder(page, /^docs$/);
    await explorer.getByRole('treeitem', { name: /untitled-2\.md/ }).click();

    await expect(
      page
        .getByLabel('breadcrumb')
        .getByRole('button', { name: 'untitled-2.md' }),
    ).toBeVisible();
  });
});

test('file explorer fills the sidebar and keeps tree state when opening notes', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1280, height: 720 });

  const workspaceName = `explorer-layout-${Date.now()}`;
  await createBrowserWorkspace(page, { workspaceName });

  await writeStoredMarkdown(page, workspaceName, 'docs/keep-open', 'Nested');
  for (let index = 0; index < 48; index++) {
    await writeStoredMarkdown(
      page,
      workspaceName,
      `note-${String(index).padStart(2, '0')}`,
      `Note ${index}`,
    );
  }

  await page.goto(
    `/ws#route=ws-home&wsName=${encodeURIComponent(workspaceName)}`,
  );
  await page.reload();

  const explorer = page.getByTestId('bangle-file-explorer');
  await expect(explorer).toBeVisible();
  await expect(
    explorer.getByRole('treeitem', { name: /^docs$/ }),
  ).toBeVisible();

  const layout = await getFileExplorerLayout(page);
  expect(layout.footerTop - layout.explorerBottom).toBeLessThanOrEqual(8);
  expect(layout.explorerHeight).toBeGreaterThan(450);
  expect(layout.scrollHeight).toBeGreaterThan(layout.scrollClientHeight);
  expect(layout.hostRight - layout.scrollRight).toBeLessThanOrEqual(1);

  await explorer.getByRole('treeitem', { name: /^docs$/ }).focus();
  await page.keyboard.press('ArrowRight');
  await expect(
    explorer.getByRole('treeitem', { name: /keep-open\.md/ }),
  ).toBeVisible();
  await explorer.getByRole('treeitem', { name: /keep-open\.md/ }).click();
  await expect(
    page.getByLabel('breadcrumb').getByRole('button', { name: 'keep-open.md' }),
  ).toBeVisible();
  await expect(
    explorer.getByRole('treeitem', { name: /^docs$/ }),
  ).toHaveAttribute('aria-expanded', 'true');

  await setFileExplorerScrollTop(page, 260);
  const beforeClick = await getFileExplorerLayout(page);
  const clickPoint = await clickVisibleFileTreeRow(page);
  await expect
    .poll(() => getEditorText(page, {}))
    .toBe(clickPoint.expectedText);
  const afterClick = await getFileExplorerLayout(page);

  expect(
    Math.abs(afterClick.scrollTop - beforeClick.scrollTop),
  ).toBeLessThanOrEqual(2);
});

test('file explorer keeps folders expanded when a note is moved', async ({
  page,
}) => {
  const workspaceName = `explorer-expansion-${Date.now()}`;
  await createBrowserWorkspace(page, { workspaceName });

  // `keep` holds a direct note plus a `nested` subfolder so neither is flattened
  // away, giving us a *deep* expansion (a level-2 folder) whose state a naive
  // `resetPaths` cannot restore from `initialExpansion` alone. `dest` is the drop
  // target and `mover` is the root note the user drags.
  await writeStoredMarkdown(page, workspaceName, 'keep/direct', 'Direct');
  await writeStoredMarkdown(page, workspaceName, 'keep/nested/deep', 'Deep');
  await writeStoredMarkdown(page, workspaceName, 'dest/existing', 'Existing');
  await writeStoredMarkdown(page, workspaceName, 'mover', 'Move me');

  await page.goto(
    `/ws#route=ws-home&wsName=${encodeURIComponent(workspaceName)}`,
  );
  await page.reload();

  const explorer = page.getByTestId('bangle-file-explorer');
  await expect(explorer).toBeVisible();
  const keepFolder = explorer.getByRole('treeitem', { name: /^keep$/ });
  const nestedFolder = explorer.getByRole('treeitem', { name: /^nested$/ });

  await keepFolder.focus();
  await page.keyboard.press('ArrowRight');
  await expect(nestedFolder).toBeVisible();
  await nestedFolder.focus();
  await page.keyboard.press('ArrowRight');
  await expect(nestedFolder).toHaveAttribute('aria-expanded', 'true');
  await expect(
    explorer.getByRole('treeitem', { name: /deep\.md/ }),
  ).toBeVisible();

  await test.step('moving a note keeps deeply expanded folders open', async () => {
    const mover = explorer.getByRole('treeitem', { name: /^mover\.md$/ });
    const dest = explorer.getByRole('treeitem', { name: /^dest$/ });
    // Pierre only begins a drag from an already-selected row, so select first.
    await mover.click();
    await dragTreeItemOnto(page, mover, dest);

    // The move is durable...
    await expect
      .poll(() => readStoredMarkdown(page, workspaceName, 'dest/mover'))
      .toBe('Move me');
    await expect
      .poll(() => readStoredMarkdown(page, workspaceName, 'mover'))
      .toBeUndefined();

    // ...and it does not collapse the nested tree the user had opened.
    await expect(nestedFolder).toHaveAttribute('aria-expanded', 'true');
    await expect(
      explorer.getByRole('treeitem', { name: /deep\.md/ }),
    ).toBeVisible();
  });
});

test('file explorer surfaces a conflict when a drag-drop move collides with an existing note', async ({
  page,
}) => {
  const workspaceName = `explorer-move-conflict-${Date.now()}`;
  await createBrowserWorkspace(page, { workspaceName });

  // `dest` already contains a note called `mover`, so dragging the root `mover`
  // into it is a name collision. The tree's drag layer rejects the drop
  // internally; without feedback the gesture used to vanish silently.
  await writeStoredMarkdown(page, workspaceName, 'dest/mover', 'Existing body');
  await writeStoredMarkdown(page, workspaceName, 'mover', 'Move me');

  await page.goto(
    `/ws#route=ws-home&wsName=${encodeURIComponent(workspaceName)}`,
  );
  await page.reload();

  const explorer = page.getByTestId('bangle-file-explorer');
  await expect(explorer).toBeVisible();

  // Both notes are called `mover.md`, so disambiguate the root note (the drag
  // source) from the colliding child by their exact tree path.
  const mover = explorer.locator('[data-item-path="mover.md"]');
  const dest = explorer.getByRole('treeitem', { name: /^dest$/ });
  // Pierre only begins a drag from an already-selected row, so select first.
  await mover.click();
  await dragTreeItemOnto(page, mover, dest);

  // The conflict is reported to the user by name instead of failing silently.
  await expect(
    page.getByText('A note named "mover.md" already exists in the destination'),
  ).toBeVisible();

  // Neither note is moved or overwritten: the source stays at the root and the
  // colliding note keeps its own content.
  await expect
    .poll(() => readStoredMarkdown(page, workspaceName, 'mover'))
    .toBe('Move me');
  await expect
    .poll(() => readStoredMarkdown(page, workspaceName, 'dest/mover'))
    .toBe('Existing body');
});

test('file explorer shows common workspace files and opens non-notes as assets', async ({
  page,
}) => {
  const workspaceName = `explorer-files-${Date.now()}`;
  const longFileName =
    'this-is-a-really-long-file-name-that-should-truncate-in-the-opened-section-instead-of-overflowing-the-sidebar.pdf';
  await createBrowserWorkspace(page, { workspaceName });

  await writeStoredMarkdown(page, workspaceName, 'notes/visible', 'Visible');
  await writeStoredFile(
    page,
    workspaceName,
    'src/component.tsx',
    'export function Component() { return null; }',
    'text/typescript',
  );
  await writeStoredFile(
    page,
    workspaceName,
    'assets/report.pdf',
    '%PDF-1.4',
    'application/pdf',
  );
  await writeStoredFile(
    page,
    workspaceName,
    longFileName,
    '%PDF-1.4 long name',
    'application/pdf',
  );
  await writeStoredFile(
    page,
    workspaceName,
    '.hidden.md',
    'Hidden dotfile',
    'text/markdown',
  );
  await writeStoredMarkdown(page, workspaceName, 'temp/legacy', 'Legacy note');
  await writeStoredFile(
    page,
    workspaceName,
    'node_modules/pkg/index.ts',
    'export const ignored = true;',
    'text/typescript',
  );
  await writeStoredFile(
    page,
    workspaceName,
    'dist/bundle.js',
    'console.log("ignored");',
    'text/javascript',
  );

  await page.goto(
    `/ws#route=ws-home&wsName=${encodeURIComponent(workspaceName)}`,
  );
  await page.reload();

  const explorer = page.getByTestId('bangle-file-explorer');
  await expect(explorer).toBeVisible();
  await expandFileTreeFolder(page, /^notes$/);
  await expandFileTreeFolder(page, /^src$/);
  await expandFileTreeFolder(page, /^assets$/);
  const notesOnlyToggle = explorer.getByRole('button', {
    name: 'Show Notes Only',
  });
  await expect(notesOnlyToggle).toHaveAttribute('aria-pressed', 'false');

  await expect(
    explorer.getByRole('treeitem', { name: /^notes$/ }),
  ).toBeVisible();
  await expect(
    explorer.getByRole('treeitem', { name: /visible\.md/ }),
  ).toBeVisible();
  await expect(explorer.getByRole('treeitem', { name: /^src$/ })).toBeVisible();
  await expect(
    explorer.getByRole('treeitem', { name: /component\.tsx/ }),
  ).toBeVisible();
  await expect(
    explorer.getByRole('treeitem', { name: /^assets$/ }),
  ).toBeVisible();
  await expect(
    explorer.getByRole('treeitem', { name: /report\.pdf/ }),
  ).toBeVisible();
  await expect(
    explorer.getByRole('treeitem', { name: longFileName }),
  ).toBeVisible();
  await expect(
    explorer.getByRole('treeitem', { name: /\.hidden\.md/ }),
  ).toBeVisible();
  await expect(explorer.getByRole('treeitem', { name: /^temp$/ })).toHaveCount(
    0,
  );
  await expect(
    explorer.getByRole('treeitem', { name: /legacy\.md/ }),
  ).toHaveCount(0);

  await test.step('non-note file options menu opens from the three-dot button', async () => {
    const reportRow = explorer.getByRole('treeitem', { name: /report\.pdf/ });

    await reportRow.hover();
    await explorer.getByRole('button', { name: 'Options' }).click();
    await expectContextMenuIsNotClipped(page);
    await expect(page.getByRole('button', { name: 'Open' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Rename' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Delete' })).toBeVisible();

    await page.getByRole('button', { name: 'Rename' }).click();
    await expect(
      page.getByRole('dialog', { name: 'Rename File' }),
    ).toBeVisible();
    await expect(page.getByLabel('New file name')).toHaveValue('report.pdf');
    await page.keyboard.press('Escape');
  });

  await test.step('toggle notes-only filtering in the explorer', async () => {
    await notesOnlyToggle.click();
    await expect(notesOnlyToggle).toHaveAttribute('aria-pressed', 'true');
    await expect(
      explorer.getByRole('treeitem', { name: /^notes$/ }),
    ).toBeVisible();
    await expect(
      explorer.getByRole('treeitem', { name: /visible\.md/ }),
    ).toBeVisible();
    await expect(
      explorer.getByRole('treeitem', { name: /\.hidden\.md/ }),
    ).toBeVisible();
    await expect(
      explorer.getByRole('treeitem', { name: /^temp$/ }),
    ).toHaveCount(0);
    await expect(
      explorer.getByRole('treeitem', { name: /legacy\.md/ }),
    ).toHaveCount(0);
    await expect(explorer.getByRole('treeitem', { name: /^src$/ })).toHaveCount(
      0,
    );
    await expect(
      explorer.getByRole('treeitem', { name: /component\.tsx/ }),
    ).toHaveCount(0);
    await expect(
      explorer.getByRole('treeitem', { name: /^assets$/ }),
    ).toHaveCount(0);
    await expect(
      explorer.getByRole('treeitem', { name: /report\.pdf/ }),
    ).toHaveCount(0);

    await page.reload();
    await expect(notesOnlyToggle).toHaveAttribute('aria-pressed', 'true');
    await expect(
      explorer.getByRole('treeitem', { name: /^notes$/ }),
    ).toBeVisible();
    await expect(
      explorer.getByRole('treeitem', { name: /\.hidden\.md/ }),
    ).toBeVisible();
    await expect(
      explorer.getByRole('treeitem', { name: /^assets$/ }),
    ).toHaveCount(0);

    await notesOnlyToggle.click();
    await expect(notesOnlyToggle).toHaveAttribute('aria-pressed', 'false');
    await expect(
      explorer.getByRole('treeitem', { name: /^src$/ }),
    ).toBeVisible();
    await expect(
      explorer.getByRole('treeitem', { name: /component\.tsx/ }),
    ).toBeVisible();
    await expect(
      explorer.getByRole('treeitem', { name: /^assets$/ }),
    ).toBeVisible();
    await expect(
      explorer.getByRole('treeitem', { name: /report\.pdf/ }),
    ).toBeVisible();

    await page.reload();
    await expect(notesOnlyToggle).toHaveAttribute('aria-pressed', 'false');
    await expect(
      explorer.getByRole('treeitem', { name: /^assets$/ }),
    ).toBeVisible();
    await expect(
      explorer.getByRole('treeitem', { name: /report\.pdf/ }),
    ).toBeVisible();
  });

  await test.step('long opened filenames truncate without widening the sidebar', async () => {
    await explorer.getByRole('treeitem', { name: longFileName }).click();
    await expect(page).toHaveURL(
      `/ws#route=asset&wsPath=${encodeURIComponent(
        `${workspaceName}:${longFileName}`,
      )}`,
    );

    const openedLink = page
      .locator('[data-sidebar="menu-button"]')
      .filter({ hasText: longFileName })
      .first();
    await expect(openedLink).toBeVisible();

    const openedLinkLayout = await openedLink.evaluate((link) => {
      const sidebar = link.closest('[data-sidebar="sidebar"]');
      const label = link.querySelector('span');
      const linkRect = link.getBoundingClientRect();
      const labelRect = label?.getBoundingClientRect();
      const sidebarRect = sidebar?.getBoundingClientRect();

      return {
        labelClientWidth: label?.clientWidth ?? 0,
        labelRectWidth: labelRect?.width ?? 0,
        labelScrollWidth: label?.scrollWidth ?? 0,
        linkRight: linkRect.right,
        sidebarRight: sidebarRect?.right ?? 0,
        sidebarWidth: sidebarRect?.width ?? 0,
      };
    });

    expect(openedLinkLayout.labelScrollWidth).toBeGreaterThan(
      openedLinkLayout.labelClientWidth,
    );
    expect(openedLinkLayout.labelRectWidth).toBeLessThanOrEqual(
      openedLinkLayout.labelClientWidth + 1,
    );
    expect(openedLinkLayout.linkRight).toBeLessThanOrEqual(
      openedLinkLayout.sidebarRight + 1,
    );
    expect(openedLinkLayout.sidebarWidth).toBeLessThanOrEqual(272);
    await expectNoPageHorizontalOverflow(page);
  });

  await expect(
    explorer.getByRole('treeitem', { name: /\.hidden\.md/ }),
  ).toBeVisible();
  await expect(
    explorer.getByRole('treeitem', { name: /^node_modules$/ }),
  ).toHaveCount(0);
  await expect(explorer.getByRole('treeitem', { name: /^dist$/ })).toHaveCount(
    0,
  );

  await explorer.getByRole('treeitem', { name: /report\.pdf/ }).click();
  await expect(page).toHaveURL(
    `/ws#route=asset&wsPath=${encodeURIComponent(
      `${workspaceName}:assets/report.pdf`,
    )}`,
  );
  await expect(page.getByRole('heading', { name: 'report.pdf' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Download' })).toBeVisible();

  await test.step('deleting the open non-note asset leaves the asset view', async () => {
    const reportRow = explorer.getByRole('treeitem', { name: /report\.pdf/ });

    await reportRow.hover();
    await explorer.getByRole('button', { name: 'Options' }).click();
    await page.getByRole('button', { name: 'Delete' }).click();

    const confirmDeleteDialog = page.getByRole('alertdialog', {
      name: 'Confirm Delete',
    });
    await expect(confirmDeleteDialog).toBeVisible();
    await expect(confirmDeleteDialog).toContainText('report.pdf');
    await confirmDeleteDialog.getByRole('button', { name: 'Delete' }).click();

    await expect(page).toHaveURL(
      `/ws#route=asset&wsPath=${encodeURIComponent(
        `${workspaceName}:assets/report.pdf`,
      )}`,
    );
    await expect(page.getByRole('heading', { name: 'report.pdf' })).toHaveCount(
      0,
    );
    await expect(
      page.getByRole('heading', { name: 'File Not Found' }),
    ).toBeVisible();
    await expect(reportRow).toHaveCount(0);
    await expect
      .poll(() => readStoredFileText(page, workspaceName, 'assets/report.pdf'))
      .toBeUndefined();
  });

  await explorer.getByRole('treeitem', { name: /visible\.md/ }).click();
  await expect(page).toHaveURL(
    `/ws#route=editor&wsPath=${encodeURIComponent(
      `${workspaceName}:notes/visible.md`,
    )}`,
  );
  await expect.poll(() => getEditorText(page, {})).toBe('Visible');
});

test('file explorer does not drop later root folders in large workspaces', async ({
  page,
}) => {
  const workspaceName = `explorer-large-${Date.now()}`;
  await createBrowserWorkspace(page, { workspaceName });

  const earlierFiles = Array.from({ length: 850 }, (_, index) => ({
    content: `export const value${index} = ${index};`,
    relativePath: `apps/generated/file-${String(index).padStart(4, '0')}.ts`,
    type: 'text/typescript',
  }));
  await writeStoredFiles(page, workspaceName, [
    ...earlierFiles,
    {
      content: '# Guide',
      relativePath: 'docs/guide.md',
      type: 'text/markdown',
    },
  ]);

  await page.goto(
    `/ws#route=ws-home&wsName=${encodeURIComponent(workspaceName)}`,
  );
  await page.reload();

  const explorer = page.getByTestId('bangle-file-explorer');
  await expect(explorer).toBeVisible();
  await expect(
    explorer.getByRole('treeitem', { name: /^apps \/ generated$/ }),
  ).toBeVisible();
  await expect(
    explorer.getByRole('treeitem', { name: /^docs$/ }),
  ).toBeVisible();
});

test('moving the open note does not flash the workspace-home screen', async ({
  page,
}) => {
  const workspaceName = `explorer-move-flash-${Date.now()}`;
  await createBrowserWorkspace(page, { workspaceName });

  await writeStoredMarkdown(page, workspaceName, 'dest/existing', 'Existing');
  await writeStoredMarkdown(page, workspaceName, 'mover', 'Move me');

  // Open the note that will be moved so the move needs to redirect the editor.
  await page.goto(
    `/ws#route=editor&wsPath=${encodeURIComponent(`${workspaceName}:mover.md`)}`,
  );
  await page.reload();
  await expect.poll(() => getEditorText(page, {})).toBe('Move me');

  // Record whether the ws-home page ever mounts while the move is in flight.
  // The old flow navigated to ws-home before the async rename, painting an
  // intermediate screen; the fix keeps the note visible until the new path is
  // durable. A MutationObserver captures the mount even if it is sub-frame.
  await page.evaluate(() => {
    const win = window as unknown as {
      __wsHomeMounts: number;
      __wsHomeObserver?: MutationObserver;
    };
    const marker = '[data-testid="page-ws-home"]';
    win.__wsHomeMounts = document.querySelector(marker) ? 1 : 0;
    const observer = new MutationObserver((records) => {
      for (const record of records) {
        for (const node of record.addedNodes) {
          if (!(node instanceof HTMLElement)) {
            continue;
          }
          if (node.matches(marker) || node.querySelector(marker)) {
            win.__wsHomeMounts += 1;
          }
        }
      }
    });
    observer.observe(document.body, { childList: true, subtree: true });
    win.__wsHomeObserver = observer;
  });

  const explorer = page.getByTestId('bangle-file-explorer');
  const moverRow = explorer.getByRole('treeitem', { name: /^mover\.md$/ });
  await moverRow.click({ button: 'right' });
  await page
    .locator('[data-file-tree-context-menu-root="true"]')
    .getByRole('button', { name: 'Move' })
    .click();

  const moveDialog = page.getByRole('dialog', { name: 'Move "mover"' });
  await expect(moveDialog).toBeVisible();
  await moveDialog.getByRole('option', { name: /dest\/?/ }).click();

  // The editor follows the note to its new path...
  await expect(page).toHaveURL(
    `/ws#route=editor&wsPath=${encodeURIComponent(
      `${workspaceName}:dest/mover.md`,
    )}`,
  );
  await expect.poll(() => getEditorText(page, {})).toBe('Move me');

  // ...without ever routing through the workspace-home screen.
  const wsHomeMounts = await page.evaluate(
    () => (window as unknown as { __wsHomeMounts: number }).__wsHomeMounts,
  );
  expect(wsHomeMounts).toBe(0);
});
