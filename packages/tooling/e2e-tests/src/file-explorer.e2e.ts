import { expect, type Page, test } from '@playwright/test';
import {
  clearEditor,
  createBrowserWorkspace,
  getEditorLocator,
  getEditorText,
  readStoredMarkdown,
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

// Pierre's file tree uses a pointer-based drag that only engages once it sees
// pointer moves separated across animation frames; a synchronous
// `locator.dragTo` (or a single stepped move) collapses into a click that just
// selects the row. Drive the gesture with real mouse events and let a frame
// elapse between phases so the durable move actually fires.
async function dragTreeItemOnto(
  page: Page,
  source: ReturnType<Page['getByRole']>,
  target: ReturnType<Page['getByRole']>,
) {
  const sourceBox = await source.boundingBox();
  const targetBox = await target.boundingBox();

  if (!sourceBox || !targetBox) {
    throw new Error('Expected drag source and target to be visible');
  }

  const sourceX = sourceBox.x + sourceBox.width / 2;
  const sourceY = sourceBox.y + sourceBox.height / 2;
  const targetX = targetBox.x + targetBox.width / 2;
  const targetY = targetBox.y + targetBox.height / 2;
  const settleFrame = () => page.waitForTimeout(60);

  await page.mouse.move(sourceX, sourceY);
  await page.mouse.down();
  await settleFrame();
  await page.mouse.move(sourceX, sourceY - 8);
  await settleFrame();
  await page.mouse.move((sourceX + targetX) / 2, (sourceY + targetY) / 2);
  await settleFrame();
  await page.mouse.move(targetX, targetY);
  await settleFrame();
  await page.mouse.move(targetX, targetY);
  await settleFrame();
  await page.mouse.up();
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
