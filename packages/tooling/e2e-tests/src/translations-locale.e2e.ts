import { expect, type Page, test } from '@playwright/test';
import { pressAppShortcut } from './common';

/** Locale bundle filenames (e.g. `['en.js', 'de.js']`) fetched so far, in order. */
async function loadedLocaleFiles(page: Page): Promise<string[]> {
  const urls = await page.evaluate(() =>
    performance
      .getEntriesByType('resource')
      .map((entry) => entry.name)
      .filter((name) => name.includes('/locales/')),
  );
  return urls.map((url) =>
    url.replace(/^.*\/locales\//, '').replace(/\?.*$/, ''),
  );
}

/** The language the running app applied to the global `t`. */
async function activeLanguage(page: Page): Promise<string | undefined> {
  return page.evaluate(() => {
    const globals = window as unknown as { t?: { meta?: { lang?: string } } };
    return globals.t?.meta?.lang;
  });
}

test.describe('translations delivery', () => {
  test('an English visitor loads only the English bundle', async ({ page }) => {
    await page.goto('/');

    // User-observable: the welcome screen renders in English.
    await expect(page.getByText('No workspace selected')).toBeVisible();
    expect(await activeLanguage(page)).toBe('English');

    // Exactly one language bundle is shipped, cache-busted with a real
    // release id rather than the build-time placeholder.
    const locales = await page.evaluate(() =>
      performance
        .getEntriesByType('resource')
        .map((entry) => entry.name)
        .filter((name) => name.includes('/locales/')),
    );
    expect(await loadedLocaleFiles(page)).toEqual(['en.js']);
    expect(locales[0]).toMatch(/\/locales\/en\.js\?v=.+/);
    expect(locales[0]).not.toContain('__BANGLE_LOCALE_VERSION__');
  });

  test.describe('German visitor', () => {
    test.use({ locale: 'de-DE' });

    test('loads the English base then German, and renders German', async ({
      page,
    }) => {
      await page.goto('/');

      // User-observable: the welcome screen renders in German.
      await expect(
        page.getByText('Kein Arbeitsbereich ausgewählt'),
      ).toBeVisible();
      expect(await activeLanguage(page)).toBe('Deutsch');

      // English is always loaded first as the fallback base, then German is
      // merged on top - never every language. Check this before further UI
      // activity so the assertion observes bootstrap request order directly.
      expect(await loadedLocaleFiles(page)).toEqual(['en.js', 'de.js']);

      await pressAppShortcut(page, 'k');
      const omniSearch = page.getByRole('dialog', {
        name: 'Omni-Befehlsleiste',
      });
      const omniInput = omniSearch.getByPlaceholder(
        'Befehl eingeben oder suchen...',
      );
      await expect(omniSearch).toBeVisible();
      await expect(omniSearch.getByText('> Befehle')).toBeVisible();
      await expect(omniSearch.getByText('Alle Dateien')).toBeVisible();
      await expect(omniSearch.getByText('Alle Befehle anzeigen')).toBeVisible();
      await omniInput.fill('definitely-no-result');
      await expect(
        omniSearch.getByText('Keine Ergebnisse gefunden.'),
      ).toBeVisible();
    });
  });
});
