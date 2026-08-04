import { expect, type Page, test } from '@playwright/test';
import { getEditorLocator, seedBrowserWorkspaceAndNote } from './common';

function dispatchInstallPromptEvent(page: Page) {
  return page.evaluate(() => {
    const event = new Event('beforeinstallprompt', {
      cancelable: true,
    }) as Event & {
      prompt: () => Promise<void>;
      userChoice: Promise<{ outcome: 'accepted' }>;
    };

    event.prompt = () => {
      const currentPromptCount =
        (window as typeof window & { __bangleTestPwaPromptCount?: number })
          .__bangleTestPwaPromptCount ?? 0;
      Object.assign(window, {
        __bangleTestPwaPromptCount: currentPromptCount + 1,
      });
      return Promise.resolve();
    };
    event.userChoice = Promise.resolve({ outcome: 'accepted' });

    window.dispatchEvent(event);
    return event.defaultPrevented;
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

function captureLaunchQueueConsumer(page: Page) {
  return page.addInitScript(() => {
    type LaunchQueueConsumer = (params: { targetURL?: string }) => void;
    let launchQueueConsumer: LaunchQueueConsumer | undefined;

    Object.defineProperty(window, 'launchQueue', {
      configurable: true,
      value: {
        setConsumer(consumer: LaunchQueueConsumer) {
          launchQueueConsumer = consumer;
        },
      },
    });
    Object.assign(window, {
      __bangleTestConsumeLaunchTarget(targetURL: string) {
        if (!launchQueueConsumer) {
          throw new Error('The app did not register a launch queue consumer');
        }
        launchQueueConsumer({ targetURL });
      },
    });
  });
}

test('serves the complete PWA manifest contract and every referenced PNG icon', async ({
  page,
}) => {
  const [indexResponse, manifestResponse] = await Promise.all([
    page.request.get('/'),
    page.request.get('/manifest.webmanifest'),
  ]);

  expect(indexResponse.status()).toBe(200);
  expect(await indexResponse.text()).toContain(
    'rel="manifest" href="/manifest.webmanifest"',
  );
  expect(manifestResponse.status()).toBe(200);
  expect(manifestResponse.headers()['content-type']).toContain(
    'application/manifest+json',
  );

  const origin = new URL(manifestResponse.url()).origin;
  const manifest = (await manifestResponse.json()) as {
    background_color: string;
    display: string;
    display_override: string[];
    icons: Array<{
      purpose: string;
      sizes: string;
      src: string;
      type: string;
    }>;
    id: string;
    launch_handler: { client_mode: string };
    name: string;
    protocol_handlers: Array<{ protocol: string; url: string }>;
    related_applications: Array<{ id: string; platform: string; url: string }>;
    scope: string;
    shortcuts: Array<{
      icons: Array<{ sizes: string; src: string; type: string }>;
      name: string;
      url: string;
    }>;
    short_name: string;
    start_url: string;
    theme_color: string;
  };

  expect(manifest).toMatchObject({
    background_color: '#ffffff',
    display: 'standalone',
    display_override: ['window-controls-overlay'],
    id: '/',
    launch_handler: { client_mode: 'focus-existing' },
    name: 'Bangle.io',
    protocol_handlers: [{ protocol: 'web+bangle', url: '/?launch=%s' }],
    scope: '/',
    short_name: 'Bangle.io',
    start_url: '/',
    theme_color: '#ffffff',
  });
  expect(manifest.related_applications).toContainEqual({
    id: `${origin}/`,
    platform: 'webapp',
    url: `${origin}/manifest.webmanifest`,
  });
  expect(manifest.shortcuts).toEqual([
    {
      icons: [
        {
          sizes: '192x192',
          src: '/icons/app-icon-192.png',
          type: 'image/png',
        },
      ],
      name: 'New note',
      url: '/?shortcut=new-note',
    },
    {
      icons: [
        {
          sizes: '192x192',
          src: '/icons/app-icon-192.png',
          type: 'image/png',
        },
      ],
      name: 'Search notes',
      url: '/?shortcut=search',
    },
  ]);
  expect(manifest.icons).toEqual([
    {
      sizes: '192x192',
      purpose: 'any',
      src: '/icons/app-icon-192.png',
      type: 'image/png',
    },
    {
      sizes: '512x512',
      purpose: 'any',
      src: '/icons/app-icon-512.png',
      type: 'image/png',
    },
  ]);

  const iconSources = new Set([
    ...manifest.icons.map((icon) => icon.src),
    ...manifest.shortcuts.flatMap((shortcut) =>
      shortcut.icons.map((icon) => icon.src),
    ),
  ]);
  for (const iconSource of iconSources) {
    const response = await page.request.get(iconSource);
    expect(response.status()).toBe(200);
    expect(response.headers()['content-type']).toContain('image/png');
  }
});

test('installs once from the sidebar, then exposes open-in-app without a same-session alert', async ({
  page,
}) => {
  await page.goto('/');

  const sidebarAction = page.getByTestId('sidebar-pwa-action');
  await expect(page.getByRole('button', { name: /Bangle\.io/ })).toBeVisible();
  await expect(sidebarAction).toHaveCount(0);

  expect(await dispatchInstallPromptEvent(page)).toBe(true);
  await expect(sidebarAction).toHaveText('Install app');

  await sidebarAction.click();
  await expect
    .poll(() =>
      page.evaluate(
        () =>
          (window as typeof window & { __bangleTestPwaPromptCount?: number })
            .__bangleTestPwaPromptCount ?? 0,
      ),
    )
    .toBe(1);
  await expect(sidebarAction).toHaveCount(0);

  await page.evaluate(() => {
    window.dispatchEvent(new Event('appinstalled'));
  });

  await expect(sidebarAction).toHaveText('Open in app');
  await page.getByRole('button', { name: /Bangle\.io/ }).click();
  await page.getByRole('menuitem', { name: 'Settings' }).click();
  await expect(page.getByRole('heading', { name: 'General' })).toBeVisible();
  await expect(page.getByTestId('settings-open-in-app')).toBeVisible();
  await expect(page.getByTestId('settings-install-app')).toHaveCount(0);
  await expect(page.getByRole('alertdialog')).toHaveCount(0);
});

test('previously installed apps prompt once and retain open-in-app entry points after reload', async ({
  page,
}) => {
  await stubInstalledRelatedApps(page);
  await page.goto('/');

  const dialog = page.getByRole('alertdialog');
  await expect(dialog).toContainText('Open in the app?');
  await dialog.getByRole('button', { name: 'Keep using this tab' }).click();
  await expect(dialog).toHaveCount(0);

  await expect(page.getByTestId('sidebar-pwa-action')).toHaveText(
    'Open in app',
  );
  await page.getByRole('button', { name: /Bangle\.io/ }).click();
  await page.getByRole('menuitem', { name: 'Settings' }).click();
  await expect(page.getByRole('heading', { name: 'General' })).toBeVisible();
  await expect(page.getByTestId('settings-open-in-app')).toBeVisible();
  await expect(page.getByTestId('settings-install-app')).toHaveCount(0);

  await page.reload({ waitUntil: 'domcontentloaded' });
  await expect(page.getByRole('heading', { name: 'General' })).toBeVisible();
  await expect(page.getByTestId('sidebar-pwa-action')).toHaveText(
    'Open in app',
  );
  await expect(page.getByTestId('settings-open-in-app')).toBeVisible();
  await expect(page.getByRole('alertdialog')).toHaveCount(0);
});

test('open-in-app dialog CTA uses the browser launch wiring and leaves the tab usable', async ({
  page,
}) => {
  // Chromium cannot install and register this test origin as an OS protocol
  // handler. The production-wired unit tests assert the exact web+bangle URL;
  // this browser test retains the real dialog -> CTA -> browser navigation
  // path and verifies that the source tab remains usable when no handler is
  // registered.
  await stubInstalledRelatedApps(page);
  await page.goto('/');

  const dialog = page.getByRole('alertdialog');
  await expect(dialog).toContainText('Open in the app?');
  await dialog.getByRole('button', { name: 'Open in app' }).click();

  await expect(dialog).toHaveCount(0);
  await expect(page.getByTestId('sidebar-pwa-action')).toHaveText(
    'Open in app',
  );
  await expect(page.getByRole('button', { name: /Bangle\.io/ })).toBeVisible();
});

test('protocol launch payload opens the seeded note and is consumed before later navigation and reload', async ({
  page,
}) => {
  const workspaceName = 'pwa-deep-link-ws';
  const noteName = 'deep-link-note';
  const seeded = await seedBrowserWorkspaceAndNote(page, {
    noteName,
    workspaceName,
  });
  const hashRoute = `route=editor&wsPath=${seeded.wsPath}`;
  const launchValue = encodeURIComponent(
    `web+bangle://open?hash=${encodeURIComponent(hashRoute)}`,
  );

  await page.goto(`/?launch=${launchValue}`, { waitUntil: 'domcontentloaded' });
  const editor = getEditorLocator(page, {});
  await expect(editor).toBeVisible();
  await expect
    .poll(() => editor.getAttribute('data-editor-name'))
    .toContain(seeded.wsPath);
  await expect
    .poll(() =>
      page.evaluate((targetWsPath) => {
        const route = new URLSearchParams(window.location.hash.slice(1));
        return (
          route.get('route') === 'editor' &&
          route.get('wsPath') === targetWsPath
        );
      }, seeded.wsPath),
    )
    .toBe(true);
  await expect.poll(() => page.evaluate(() => window.location.search)).toBe('');

  await page.getByRole('button', { name: /Bangle\.io/ }).click();
  await page.getByRole('menuitem', { name: 'Settings' }).click();
  await expect(page.getByRole('heading', { name: 'General' })).toBeVisible();
  expect(new URL(page.url()).search).toBe('');

  await page.reload({ waitUntil: 'domcontentloaded' });
  await expect(page.getByRole('heading', { name: 'General' })).toBeVisible();
  expect(new URL(page.url()).search).toBe('');
});

test('an already-open app consumes a protocol LaunchQueue target once', async ({
  page,
}) => {
  await captureLaunchQueueConsumer(page);
  const seeded = await seedBrowserWorkspaceAndNote(page, {
    noteName: 'launch-queue-target',
    workspaceName: 'pwa-launch-queue-ws',
  });

  await page.getByRole('button', { name: /Bangle\.io/ }).click();
  await page.getByRole('menuitem', { name: 'Settings' }).click();
  await expect(page.getByRole('heading', { name: 'General' })).toBeVisible();

  const hashRoute = `route=editor&wsPath=${seeded.wsPath}`;
  const launchValue = encodeURIComponent(
    `web+bangle://open?hash=${encodeURIComponent(hashRoute)}`,
  );
  await page.evaluate(
    (targetURL) => {
      const consumeLaunchTarget = (
        window as typeof window & {
          __bangleTestConsumeLaunchTarget?: (url: string) => void;
        }
      ).__bangleTestConsumeLaunchTarget;
      if (!consumeLaunchTarget) {
        throw new Error('Launch queue test bridge is unavailable');
      }
      consumeLaunchTarget(targetURL);
    },
    `${new URL(page.url()).origin}/?launch=${launchValue}`,
  );

  const editor = getEditorLocator(page, {});
  await expect(editor).toBeVisible();
  await expect
    .poll(() => editor.getAttribute('data-editor-name'))
    .toContain(seeded.wsPath);
  expect(new URL(page.url()).searchParams.has('launch')).toBe(false);
  expect(new URL(page.url()).searchParams.has('shortcut')).toBe(false);

  await page.getByRole('button', { name: /Bangle\.io/ }).click();
  await page.getByRole('menuitem', { name: 'Settings' }).click();
  await expect(page.getByRole('heading', { name: 'General' })).toBeVisible();
  await page.reload({ waitUntil: 'domcontentloaded' });
  await expect(page.getByRole('heading', { name: 'General' })).toBeVisible();
});

test('manifest search and new-note shortcuts consume their launch query and act in the seeded workspace', async ({
  page,
}) => {
  await test.step('open then dismiss search', async () => {
    // Consuming the launch query immediately updates the client route. Waiting
    // only for the response commit keeps this navigation stable while the app
    // performs that intentional client-side URL cleanup.
    await page.goto('/?shortcut=search', { waitUntil: 'commit' });
    await expect(
      page.getByPlaceholder('Type a command or search...'),
    ).toBeVisible();
    await expect
      .poll(() => page.evaluate(() => window.location.search))
      .toBe('');
    await page.keyboard.press('Escape');
    await expect(
      page.getByPlaceholder('Type a command or search...'),
    ).toHaveCount(0);
    await page.reload({ waitUntil: 'domcontentloaded' });
    await expect(
      page.getByPlaceholder('Type a command or search...'),
    ).toHaveCount(0);
  });

  await test.step('create a note in the most recent available workspace', async () => {
    await seedBrowserWorkspaceAndNote(page, {
      noteName: 'older-workspace-note',
      workspaceName: 'pwa-shortcut-older-ws',
    });
    const workspaceName = 'pwa-shortcut-recent-ws';
    await seedBrowserWorkspaceAndNote(page, {
      noteName: 'recent-workspace-note',
      workspaceName,
    });

    await page.goto('/?shortcut=new-note', { waitUntil: 'commit' });
    await expect(page.getByLabel('Note name')).toBeVisible();
    await page.getByLabel('Note name').fill('shortcut-created-note');
    await page.getByRole('button', { name: 'Create' }).click();

    const editor = getEditorLocator(page, {});
    await expect(editor).toBeVisible();
    await expect
      .poll(() => editor.getAttribute('data-editor-name'))
      .toContain(`${workspaceName}:shortcut-created-note.md`);
    await expect
      .poll(() => page.evaluate(() => window.location.search))
      .toBe('');

    await page.reload({ waitUntil: 'domcontentloaded' });
    await expect(page.getByLabel('Note name')).toHaveCount(0);
    await expect(editor).toBeVisible();
    await expect
      .poll(() => editor.getAttribute('data-editor-name'))
      .toContain(`${workspaceName}:shortcut-created-note.md`);
  });
});
