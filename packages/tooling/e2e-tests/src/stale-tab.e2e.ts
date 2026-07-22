import { expect, test } from '@playwright/test';

test('an outdated tab is blocked with a reload prompt when a newer version runs', async ({
  page,
}) => {
  // Install a newer-build participant before the app loads. It answers the
  // app's hello through the same RootEvents envelope used by real tabs.
  await page.addInitScript(() => {
    const channel = new BroadcastChannel('bangle_io_channel');
    channel.addEventListener('message', (event) => {
      const message = event.data as {
        data?: { event?: string; payload?: { reply?: boolean } };
      };
      if (
        message.data?.event !== 'event::app:build-presence' ||
        message.data.payload?.reply !== false
      ) {
        return;
      }
      channel.postMessage({
        senderId: 'future-build-tab',
        data: {
          event: 'event::app:build-presence',
          payload: {
            protocol: 1,
            buildId: 'future-build',
            builtAt: Date.parse('9999-12-31T23:59:59.999Z'),
            reply: true,
            sender: { id: 'future-build-tab', tag: 'e2e-build' },
          },
        },
        timestamp: Date.now(),
      });
    });
    window.addEventListener('unload', () => channel.close(), { once: true });
  });
  await page.goto('/');

  const dialog = page.getByTestId('stale-tab-dialog');
  await expect(dialog).toBeVisible();
  await expect(
    dialog.getByRole('button', { name: 'Reload tab' }),
  ).toBeVisible();
  // The dialog is non-dismissable: Escape must not close it.
  await page.keyboard.press('Escape');
  await expect(dialog).toBeVisible();
  // The reload button is a plain window.location.reload().
});
