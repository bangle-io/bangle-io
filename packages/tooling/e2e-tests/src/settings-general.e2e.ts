import { expect, test } from '@playwright/test';
import { createBrowserWorkspaceAndNote } from './common';

const PRIVATE_BUG_REPORT_MARKERS = [
  'PRIVATE_WORKSPACE',
  'PRIVATE_NOTE',
  'SECRET_NOTE_CONTENT',
  'PRIVATE_CAUSE',
  'PRIVATE_PROPERTY',
] as const;

async function dispatchPrivateTestError(page: import('@playwright/test').Page) {
  await page.evaluate(() => {
    const error = new TypeError('SECRET_NOTE_CONTENT', {
      cause: new Error('PRIVATE_CAUSE'),
    });
    Object.assign(error, {
      wsPath: 'PRIVATE_WORKSPACE:PRIVATE_NOTE.md',
      privateProperty: 'PRIVATE_PROPERTY',
    });
    window.dispatchEvent(
      new ErrorEvent('error', {
        error,
        message: error.message,
      }),
    );
  });
}

async function triggerPrivateReactRenderCrash(
  page: import('@playwright/test').Page,
) {
  await page.waitForFunction(() =>
    Boolean(
      (
        window as typeof window & {
          services?: { core?: { navigation?: unknown } };
        }
      ).services?.core?.navigation,
    ),
  );
  await page.evaluate(() => {
    const exposedWindow = window as typeof window & {
      services?: {
        core?: {
          navigation?: {
            $routeInfo: unknown;
            store: {
              set: (target: unknown, value: unknown) => void;
            };
          };
        };
      };
    };
    const navigation = exposedWindow.services?.core?.navigation;
    if (!navigation) {
      throw new Error('Debug navigation service is unavailable');
    }
    navigation.store.set(navigation.$routeInfo, {
      route: 'PRIVATE_NOTE_RENDER_CRASH',
      payload: {},
    });
  });
}

async function readPersistedPrivacySafeReports(
  page: import('@playwright/test').Page,
) {
  return page.evaluate(
    () =>
      new Promise<unknown[]>((resolve, reject) => {
        const openRequest = indexedDB.open('bangle-io-db');
        openRequest.onerror = () => reject(openRequest.error);
        openRequest.onsuccess = () => {
          const database = openRequest.result;
          const transaction = database.transaction('MiscTable', 'readonly');
          const getAllRequest = transaction.objectStore('MiscTable').getAll();
          getAllRequest.onerror = () => reject(getAllRequest.error);
          getAllRequest.onsuccess = () => {
            const values = (getAllRequest.result as Array<{ value?: unknown }>)
              .map((record) => record.value)
              .filter(
                (value) =>
                  value &&
                  typeof value === 'object' &&
                  'schemaVersion' in value,
              );
            database.close();
            resolve(values);
          };
        };
      }),
  );
}

test('general settings update and persist user preferences', async ({
  page,
}) => {
  await page.goto('/');

  await page.getByRole('button', { name: /Bangle\.io/ }).click();
  await expect(
    page.getByRole('menuitem', { name: 'Change Theme' }),
  ).toHaveCount(0);
  await page.getByRole('menuitem', { name: 'Settings' }).click();

  await expect(page.getByRole('link', { name: 'Back to app' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'General' })).toBeVisible();
  await expect(
    page.getByRole('heading', { exact: true, name: 'App' }),
  ).toBeVisible();
  await expect(page.getByTestId('app-version')).toHaveText(
    /^\d+\.\d+\.\d+(?:[-+].*)?$/,
  );
  await expect(page.getByRole('button', { name: 'Install app' })).toHaveCount(
    0,
  );

  await page.getByRole('combobox', { name: 'Theme preference' }).click();
  await page.getByRole('option', { name: 'Dark' }).click();
  await expect(page.locator('html')).toHaveAttribute(
    'data-theme',
    'BU_dark-scheme',
  );

  const defaultWidth = page.getByRole('radio', { name: 'Default' });
  const wideWidth = page.getByRole('radio', { name: 'Wide' });
  await expect(wideWidth).toBeChecked();
  await defaultWidth.click();
  await expect(defaultWidth).toBeChecked();
  await expect(wideWidth).not.toBeChecked();

  await page.getByRole('combobox', { name: 'Asset location' }).click();
  await page.getByRole('option', { name: 'Adjacent to note' }).click();

  await page.reload({ waitUntil: 'networkidle' });

  await expect(page.getByRole('heading', { name: 'General' })).toBeVisible();
  await expect(page.locator('html')).toHaveAttribute(
    'data-theme',
    'BU_dark-scheme',
  );
  await expect(
    page.getByRole('combobox', { name: 'Theme preference' }),
  ).toContainText('Dark');
  await expect(
    page.getByRole('combobox', { name: 'Asset location' }),
  ).toContainText('Adjacent to note');
  await expect(page.getByRole('radio', { name: 'Default' })).toBeChecked();
});

test('general settings returns to the route it was opened from', async ({
  page,
}) => {
  const workspaceName = 'settings-return-workspace';
  const noteName = 'settings-return-note';

  await createBrowserWorkspaceAndNote(page, { workspaceName, noteName });

  await expect(
    page
      .getByLabel('breadcrumb')
      .getByRole('button', { name: `${noteName}.md` }),
  ).toBeVisible();

  await page.getByRole('button', { name: /Bangle\.io/ }).click();
  await page.getByRole('menuitem', { name: 'Settings' }).click();

  await expect(page.getByRole('heading', { name: 'General' })).toBeVisible();

  await page.getByRole('link', { name: 'Back to app' }).click();

  await expect(
    page
      .getByLabel('breadcrumb')
      .getByRole('button', { name: `${noteName}.md` }),
  ).toBeVisible();
});

test('bug reports exclude note data and respect the persistent manual-only setting', async ({
  page,
}) => {
  test.slow();
  const envelopes: string[] = [];
  await page.route('https://o573373.ingest.us.sentry.io/**', async (route) => {
    envelopes.push(route.request().postData() ?? '');
    await route.fulfill({ status: 200, body: '{}' });
  });

  await createBrowserWorkspaceAndNote(page, {
    workspaceName: 'PRIVATE_WORKSPACE',
    noteName: 'PRIVATE_NOTE',
  });
  await dispatchPrivateTestError(page);

  await expect.poll(() => envelopes.length).toBe(1);
  for (const marker of PRIVATE_BUG_REPORT_MARKERS) {
    expect(envelopes[0]).not.toContain(marker);
  }
  expect(envelopes[0]).toContain('"reporting_mode":"automatic"');
  expect(envelopes[0]).toContain('"route":"editor"');

  await page.getByRole('button', { name: /Bangle\.io/ }).click();
  await page.getByRole('menuitem', { name: 'Settings' }).click();

  const reportingSwitch = page.getByRole('switch', {
    name: 'Automatically send bug reports',
  });
  await expect(reportingSwitch).toBeChecked();
  await reportingSwitch.click();

  const confirmation = page.getByRole('alertdialog', {
    name: 'Turn off automatic bug reports?',
  });
  await expect(confirmation).toContainText(
    'Automatic reports are vital for finding and fixing failures.',
  );
  await expect(confirmation).toContainText(
    'Bangle excludes your note data and identifying names from the diagnostic payload.',
  );
  await confirmation.getByRole('button', { name: 'Turn off' }).click();
  await expect(reportingSwitch).not.toBeChecked();

  await page.getByRole('link', { name: 'Back to app' }).click();
  await page.reload({ waitUntil: 'networkidle' });
  await dispatchPrivateTestError(page);

  const manualReportDialog = page.getByRole('dialog', {
    name: 'Help us fix this bug?',
  });
  await expect(manualReportDialog).toBeVisible();
  const preview = manualReportDialog.getByTestId('manual-bug-report-preview');
  await expect(preview).toContainText('"schemaVersion": 2');
  await expect(preview).toContainText('"errorType": "TypeError"');
  await expect(preview).toContainText('"route": "editor"');
  for (const marker of PRIVATE_BUG_REPORT_MARKERS) {
    await expect(preview).not.toContainText(marker);
  }
  expect(envelopes).toHaveLength(1);

  await manualReportDialog.getByRole('button', { name: 'Send report' }).click();
  await expect(manualReportDialog).not.toBeVisible();
  await expect.poll(() => envelopes.length).toBe(2);
  expect(envelopes[1]).toContain('"reporting_mode":"manual"');
  for (const marker of PRIVATE_BUG_REPORT_MARKERS) {
    expect(envelopes[1]).not.toContain(marker);
  }
  await expect.poll(() => readPersistedPrivacySafeReports(page)).toEqual([]);

  await dispatchPrivateTestError(page);
  await expect(manualReportDialog).toBeVisible();
  await manualReportDialog
    .getByRole('button', { name: 'Keep for later' })
    .click();
  await expect(manualReportDialog).not.toBeVisible();

  await page.getByRole('button', { name: /Bangle\.io/ }).click();
  await page.getByRole('menuitem', { name: 'Settings' }).click();
  await expect(
    page.getByText(
      '1 privacy-safe report is stored only on this device. Send it when you are ready.',
    ),
  ).toBeVisible();
  expect(envelopes).toHaveLength(2);

  const persistedBeforeReload = await readPersistedPrivacySafeReports(page);
  expect(persistedBeforeReload).toHaveLength(1);
  for (const marker of PRIVATE_BUG_REPORT_MARKERS) {
    expect(JSON.stringify(persistedBeforeReload)).not.toContain(marker);
  }

  await page.reload({ waitUntil: 'networkidle' });
  await expect(reportingSwitch).not.toBeChecked();
  await expect(
    page.getByRole('button', { name: 'Send reports' }),
  ).toBeEnabled();
  await page.getByRole('button', { name: 'Send reports' }).click();

  await expect.poll(() => envelopes.length).toBe(3);
  expect(envelopes[2]).toContain('"reporting_mode":"manual"');
  for (const marker of PRIVATE_BUG_REPORT_MARKERS) {
    expect(envelopes[2]).not.toContain(marker);
  }
  await expect(
    page.getByRole('button', { name: 'Send reports' }),
  ).toBeDisabled();
  await expect.poll(() => readPersistedPrivacySafeReports(page)).toEqual([]);
});

test('invalid bug report consent data fails closed after services mount', async ({
  page,
}) => {
  const envelopes: string[] = [];
  await page.route('https://o573373.ingest.us.sentry.io/**', async (route) => {
    envelopes.push(route.request().postData() ?? '');
    await route.fulfill({ status: 200, body: '{}' });
  });
  await page.addInitScript(() => {
    localStorage.setItem(
      'browser-local-storage-sync-database.sync:error-reporting:automatic-error-reporting',
      'invalid-json',
    );
  });

  await page.goto('/');
  await dispatchPrivateTestError(page);

  const manualReportDialog = page.getByRole('dialog', {
    name: 'Help us fix this bug?',
  });
  await expect(manualReportDialog).toBeVisible();
  expect(envelopes).toHaveLength(0);

  await manualReportDialog
    .getByRole('button', { name: 'Keep for later' })
    .click();
  await page.getByRole('button', { name: /Bangle\.io/ }).click();
  await page.getByRole('menuitem', { name: 'Settings' }).click();
  await expect(
    page.getByRole('switch', { name: 'Automatically send bug reports' }),
  ).not.toBeChecked();
});

test('manual report review survives a React render boundary crash', async ({
  page,
}) => {
  const envelopes: string[] = [];
  await page.route('https://o573373.ingest.us.sentry.io/**', async (route) => {
    envelopes.push(route.request().postData() ?? '');
    await route.fulfill({ status: 200, body: '{}' });
  });
  await page.addInitScript(() => {
    localStorage.setItem(
      'browser-local-storage-sync-database.sync:error-reporting:automatic-error-reporting',
      'false',
    );
  });
  await page.goto('/?debug=true');

  await triggerPrivateReactRenderCrash(page);

  await expect(page.getByText('Something went wrong')).toBeAttached();
  const manualReportDialog = page.getByRole('dialog', {
    name: 'Help us fix this bug?',
  });
  await expect(manualReportDialog).toBeVisible();
  await expect(
    manualReportDialog.getByTestId('manual-bug-report-preview'),
  ).not.toContainText('PRIVATE_NOTE_RENDER_CRASH');
  expect(envelopes).toHaveLength(0);

  await manualReportDialog.getByRole('button', { name: 'Send report' }).click();
  await expect.poll(() => envelopes.length).toBe(1);
  expect(envelopes[0]).toContain('"reporting_mode":"manual"');
  expect(envelopes[0]).not.toContain('PRIVATE_NOTE_RENDER_CRASH');
});

test('general settings rejects an external return target after path normalization', async ({
  page,
}) => {
  const hash = new URLSearchParams({
    route: 'settings-general',
    returnTo: '/foo/..//evil.example/path',
  });

  await page.goto(`/#${hash.toString()}`);
  await expect(page.getByRole('heading', { name: 'General' })).toBeVisible();

  const backLink = page.getByRole('link', { name: 'Back to app' });
  const href = await backLink.getAttribute('href');
  expect(href).not.toBeNull();
  expect(new URL(href ?? '', page.url()).origin).toBe(
    new URL(page.url()).origin,
  );

  await backLink.click();
  await expect(page).toHaveURL(/#route=welcome$/);
});

test('general settings can install the PWA when the browser exposes an install prompt', async ({
  page,
}) => {
  await page.addInitScript(() => {
    window.addEventListener('beforeinstallprompt', (event) => {
      Object.assign(window, {
        __bangleTestBeforeInstallPromptPrevented: event.defaultPrevented,
      });
    });
  });

  await page.goto('/');

  // Navigate through the mounted app before dispatching the synthetic event.
  // The document title is present in the static HTML, so waiting on it does
  // not guarantee React's beforeinstallprompt listener has been registered.
  await page.getByRole('button', { name: /Bangle\.io/ }).click();
  await page.getByRole('menuitem', { name: 'Settings' }).click();
  await expect(page.getByRole('heading', { name: 'General' })).toBeVisible();

  await page.evaluate(() => {
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
    Object.assign(window, {
      __bangleTestBeforeInstallPromptPrevented: event.defaultPrevented,
    });
  });

  await expect(
    page.getByRole('heading', { exact: true, name: 'App' }),
  ).toBeVisible();
  await expect(
    page.getByText(
      'Add Bangle.io to this device and open it in its own app window.',
    ),
  ).toBeVisible();

  await page.getByTestId('settings-install-app').click();

  await expect
    .poll(() =>
      page.evaluate(() =>
        Boolean(
          (
            window as typeof window & {
              __bangleTestPwaPrompted?: boolean;
            }
          ).__bangleTestPwaPrompted,
        ),
      ),
    )
    .toBe(true);
  await expect
    .poll(() =>
      page.evaluate(() =>
        Boolean(
          (
            window as typeof window & {
              __bangleTestBeforeInstallPromptPrevented?: boolean;
            }
          ).__bangleTestBeforeInstallPromptPrevented,
        ),
      ),
    )
    .toBe(true);
  await expect(page.getByRole('button', { name: 'Install app' })).toHaveCount(
    0,
  );
});
