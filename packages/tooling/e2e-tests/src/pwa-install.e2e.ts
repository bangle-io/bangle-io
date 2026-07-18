import { expect, type Page, test } from '@playwright/test';
import { createBrowserWorkspaceAndNote, getEditorLocator } from './common';

function dispatchInstallPromptEvent(page: Page) {
  return page.evaluate(() => {
    const event = new Event('beforeinstallprompt', {
      cancelable: true,
    }) as Event & {
      prompt: () => Promise<void>;
      userChoice: Promise<{ outcome: 'accepted' }>;
    };

    event.prompt = () => {
      Object.assign(window, { __bangleTestPwaPrompted: true });
      return Promise.resolve();
    };
    event.userChoice = Promise.resolve({ outcome: 'accepted' });

    window.dispatchEvent(event);
  });
}

function stubInstalledRelatedApps(page: Page) {
  return page.addInitScript(() => {
    Object.defineProperty(window.navigator, 'getInstalledRelatedApps', {
      configurable: true,
      value: () =>
        Promise.resolve([
          {
            platform: 'webapp',
            url: `${window.location.origin}/manifest.webmanifest`,
          },
        ]),
    });
  });
}

test('sidebar shows a one-click install pill while the browser offers a PWA install', async ({
  page,
}) => {
  await page.goto('/');

  // The pill only appears once the browser hands over an install prompt.
  const pill = page.getByTestId('sidebar-pwa-action');
  await expect(page.getByRole('button', { name: /Bangle\.io/ })).toBeVisible();
  await expect(pill).toHaveCount(0);

  await dispatchInstallPromptEvent(page);

  await expect(pill).toBeVisible();
  await expect(pill).toHaveText(/Install app/);

  await pill.click();

  await expect
    .poll(() =>
      page.evaluate(() =>
        Boolean(
          (window as typeof window & { __bangleTestPwaPrompted?: boolean })
            .__bangleTestPwaPrompted,
        ),
      ),
    )
    .toBe(true);

  // Accepted install consumes the deferred prompt, so the install pill goes
  // away; the browser then fires appinstalled, which flips the sidebar to the
  // open-in-app affordance.
  await expect(page.getByTestId('sidebar-pwa-action')).toHaveCount(0);

  await page.evaluate(() => {
    window.dispatchEvent(new Event('appinstalled'));
  });

  await expect(pill).toBeVisible();
  await expect(pill).toHaveText(/Open in app/);

  // Installing from this tab must NOT pop the "Open in the app?" dialog:
  // Chrome auto-opens the freshly installed app window, so prompting here
  // would be redundant (regression check for the install→prompt race).
  await expect(page.getByRole('alertdialog')).toHaveCount(0);
});

test('installed app detected from a browser tab shows a one-time open-in-app dialog', async ({
  page,
}) => {
  await stubInstalledRelatedApps(page);

  await page.goto('/');

  const dialog = page.getByRole('alertdialog');
  await expect(dialog).toBeVisible();
  await expect(dialog).toContainText('Open in the app?');

  await dialog.getByRole('button', { name: 'Keep using this tab' }).click();
  await expect(dialog).toHaveCount(0);

  // After dismissal the sidebar keeps a persistent open-in-app entry point.
  const pill = page.getByTestId('sidebar-pwa-action');
  await expect(pill).toBeVisible();
  await expect(pill).toHaveText(/Open in app/);

  // Settings shows the open-in-app row instead of the install row.
  await page.getByRole('button', { name: /Bangle\.io/ }).click();
  await page.getByRole('menuitem', { name: 'Settings' }).click();
  await expect(page.getByRole('heading', { name: 'General' })).toBeVisible();
  await expect(page.getByTestId('settings-open-in-app')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Install app' })).toHaveCount(
    0,
  );

  // The dismissal is persisted: reloading must not re-show the dialog.
  await page.reload({ waitUntil: 'networkidle' });
  await expect(page.getByRole('heading', { name: 'General' })).toBeVisible();
  await expect(page.getByTestId('sidebar-pwa-action')).toBeVisible();
  await expect(page.getByRole('alertdialog')).toHaveCount(0);
});

test('a protocol launch payload deep-links into the carried note route', async ({
  page,
}) => {
  const workspaceName = 'pwa-deep-link-ws';
  const noteName = 'deep-link-note';
  await createBrowserWorkspaceAndNote(page, { workspaceName, noteName });

  const hashRoute = `route=editor&wsPath=${workspaceName}:${noteName}.md`;
  const launchValue = encodeURIComponent(
    `web+bangle://open?hash=${encodeURIComponent(hashRoute)}`,
  );

  await page.goto(`/?launch=${launchValue}`);

  const editor = getEditorLocator(page, {});
  await expect(editor).toBeVisible();
  await expect
    .poll(() => editor.getAttribute('data-editor-name'))
    .toContain(`${workspaceName}:${noteName}.md`);
  // The launch param is consumed; the visible URL is the canonical route.
  await expect.poll(() => page.evaluate(() => window.location.search)).toBe('');
});

test('the search manifest shortcut opens omni-search on launch', async ({
  page,
}) => {
  await page.goto('/?shortcut=search');

  await expect(
    page.getByPlaceholder('Type a command or search...'),
  ).toBeVisible();
  await expect.poll(() => page.evaluate(() => window.location.search)).toBe('');
});

test('the new-note manifest shortcut lands in the recent workspace and opens the create dialog', async ({
  page,
}) => {
  const workspaceName = 'pwa-shortcut-ws';
  const noteName = 'shortcut-existing-note';
  await createBrowserWorkspaceAndNote(page, { workspaceName, noteName });

  await page.goto('/?shortcut=new-note');

  await expect(page.getByLabel('Note name')).toBeVisible();
  await page.getByLabel('Note name').fill('shortcut-created-note');
  await page.getByRole('button', { name: 'Create' }).click();

  const editor = getEditorLocator(page, {});
  await expect(editor).toBeVisible();
  await expect
    .poll(() => editor.getAttribute('data-editor-name'))
    .toContain(`${workspaceName}:shortcut-created-note.md`);
});

test('opening a Markdown file through the OS imports it into a chosen workspace', async ({
  page,
}) => {
  const workspaceName = 'pwa-file-open-ws';
  const noteName = 'file-open-existing-note';
  await createBrowserWorkspaceAndNote(page, { workspaceName, noteName });

  // Simulate Chromium's launch queue delivering an OS file-open launch. The
  // fake handle only needs the subset of FileSystemFileHandle the app uses.
  await page.addInitScript(() => {
    // Chromium exposes a native getter-only window.launchQueue in plain
    // tabs, so the stub must be installed via defineProperty.
    Object.defineProperty(window, 'launchQueue', {
      configurable: true,
      value: {
        setConsumer: (
          consumer: (params: {
            files: Array<{ name: string; getFile: () => Promise<File> }>;
          }) => void,
        ) => {
          setTimeout(() => {
            consumer({
              files: [
                {
                  name: 'imported-ideas.md',
                  getFile: () =>
                    Promise.resolve(
                      new File(
                        ['# Imported ideas\n\nBrought in from disk.'],
                        'imported-ideas.md',
                        { type: 'text/markdown' },
                      ),
                    ),
                },
              ],
            });
          }, 0);
        },
      },
    });
  });

  await page.goto('/');

  await expect(
    page.getByRole('heading', { name: 'Import into workspace' }),
  ).toBeVisible();
  await page.getByRole('option', { name: workspaceName }).click();

  const editor = getEditorLocator(page, {});
  await expect(editor).toBeVisible();
  await expect
    .poll(() => editor.getAttribute('data-editor-name'))
    .toContain(`${workspaceName}:imported-ideas.md`);
  await expect(
    editor.getByRole('heading', { name: 'Imported ideas' }),
  ).toBeVisible();
  await expect(editor).toContainText('Brought in from disk.');
});

type LaunchFilePayload = { name: string; content: string };
type WindowWithLaunchConsumer = typeof window & {
  __lqConsumer?: (params: {
    files: Array<{ name: string; getFile: () => Promise<File> }>;
  }) => void;
};

// Installs a launch-queue stub whose consumer is captured for manual firing,
// so tests can deliver OS file-open launches at any point in the session.
function stubManualLaunchQueue(page: Page) {
  return page.addInitScript(() => {
    Object.defineProperty(window, 'launchQueue', {
      configurable: true,
      value: {
        setConsumer: (
          consumer: (params: {
            files: Array<{ name: string; getFile: () => Promise<File> }>;
          }) => void,
        ) => {
          Object.assign(window, { __lqConsumer: consumer });
        },
      },
    });
  });
}

async function fireLaunchFiles(page: Page, files: LaunchFilePayload[]) {
  await expect
    .poll(() =>
      page.evaluate(
        () => typeof (window as WindowWithLaunchConsumer).__lqConsumer,
      ),
    )
    .toBe('function');

  await page.evaluate((payloads: LaunchFilePayload[]) => {
    (window as WindowWithLaunchConsumer).__lqConsumer?.({
      files: payloads.map((payload) => ({
        name: payload.name,
        getFile: () =>
          Promise.resolve(
            new File([payload.content], payload.name, {
              type: 'text/markdown',
            }),
          ),
      })),
    });
  }, files);
}

test('file launches arriving while the import picker is open merge into one batch', async ({
  page,
}) => {
  const workspaceName = 'pwa-merge-ws';
  await createBrowserWorkspaceAndNote(page, {
    workspaceName,
    noteName: 'merge-existing-note',
  });
  await stubManualLaunchQueue(page);
  await page.goto('/');

  await fireLaunchFiles(page, [{ name: 'first-batch.md', content: '# One' }]);
  await expect(
    page.getByRole('heading', { name: 'Import into workspace' }),
  ).toBeVisible();

  // A second OS launch while the picker is open must not replace the first.
  await fireLaunchFiles(page, [{ name: 'second-batch.md', content: '# Two' }]);
  await page.getByRole('option', { name: workspaceName }).click();

  await expect(page.getByText('Imported 2 notes')).toBeVisible();
  const editor = getEditorLocator(page, {});
  await expect
    .poll(() => editor.getAttribute('data-editor-name'))
    .toContain(`${workspaceName}:first-batch.md`);
});

test('a partial import failure reports the failed file and never touches the existing note', async ({
  page,
}) => {
  const workspaceName = 'pwa-partial-ws';
  const existingNote = 'partial-existing-note';
  await createBrowserWorkspaceAndNote(page, {
    workspaceName,
    noteName: existingNote,
  });
  await stubManualLaunchQueue(page);
  await page.goto('/');

  await fireLaunchFiles(page, [
    { name: `${existingNote}.md`, content: 'OVERWRITE ATTEMPT' },
    { name: 'partial-fresh-note.md', content: '# Fresh import' },
  ]);

  await expect(
    page.getByRole('heading', { name: 'Import into workspace' }),
  ).toBeVisible();
  await page.getByRole('option', { name: workspaceName }).click();

  // Explicit partial outcome: the collision is reported by name, the fresh
  // file succeeds, and navigation goes to the first *successful* import.
  await expect(
    page.getByText(`Could not import ${existingNote}.md`),
  ).toBeVisible();
  await expect(
    page.getByText('Imported 1 note', { exact: true }),
  ).toBeVisible();
  const editor = getEditorLocator(page, {});
  await expect
    .poll(() => editor.getAttribute('data-editor-name'))
    .toContain(`${workspaceName}:partial-fresh-note.md`);

  // The pre-existing note keeps its content: never overwritten by an import.
  await page
    .getByRole('treeitem', { name: `${existingNote}.md`, exact: true })
    .click();
  await expect
    .poll(() => editor.getAttribute('data-editor-name'))
    .toContain(`${workspaceName}:${existingNote}.md`);
  await expect(editor).not.toContainText('OVERWRITE ATTEMPT');
});

test('dismissing the import picker drops the queued files', async ({
  page,
}) => {
  const workspaceName = 'pwa-dismiss-ws';
  await createBrowserWorkspaceAndNote(page, {
    workspaceName,
    noteName: 'dismiss-existing-note',
  });
  await stubManualLaunchQueue(page);
  await page.goto('/');

  await fireLaunchFiles(page, [
    { name: 'dropped-note.md', content: '# Dropped' },
  ]);
  await expect(
    page.getByRole('heading', { name: 'Import into workspace' }),
  ).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(
    page.getByRole('heading', { name: 'Import into workspace' }),
  ).toHaveCount(0);

  // A later launch starts a fresh batch: the dismissed file must not revive.
  await fireLaunchFiles(page, [{ name: 'kept-note.md', content: '# Kept' }]);
  await expect(
    page.getByRole('heading', { name: 'Import into workspace' }),
  ).toBeVisible();
  await page.getByRole('option', { name: workspaceName }).click();

  await expect(
    page.getByText('Imported 1 note', { exact: true }),
  ).toBeVisible();
  const editor = getEditorLocator(page, {});
  await expect
    .poll(() => editor.getAttribute('data-editor-name'))
    .toContain(`${workspaceName}:kept-note.md`);
});

test('accepting the open-in-app dialog closes it and keeps the tab usable', async ({
  page,
}) => {
  // The actual protocol launch (web+bangle://) needs a real installed PWA and
  // OS integration, so it cannot be observed here; the unit tests cover the
  // protocol URL. This test covers the dialog CTA path staying non-destructive
  // in a browser without a registered handler.
  await stubInstalledRelatedApps(page);

  await page.goto('/');

  const dialog = page.getByRole('alertdialog');
  await expect(dialog).toBeVisible();
  await dialog.getByRole('button', { name: 'Open in app' }).click();

  await expect(dialog).toHaveCount(0);
  await expect(page.getByTestId('sidebar-pwa-action')).toBeVisible();
  await expect(page.getByRole('button', { name: /Bangle\.io/ })).toBeVisible();
});
