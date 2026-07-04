import { expect, test } from '@playwright/test';
import { expectReadableContrast } from './common';

function parseOklchColor(value: string): [number, number, number] | undefined {
  const match = value.match(
    /^oklch\(\s*([\d.]+)(%)?\s+([\d.]+)\s+([\d.]+)\s*\)$/i,
  );
  if (!match) {
    return undefined;
  }

  const lightness = Number(match[1]);
  return [
    match[2] ? lightness / 100 : lightness,
    Number(match[3]),
    Number(match[4]),
  ];
}

function expectCssColorEquivalent(actual: string, expected: string) {
  const actualOklch = parseOklchColor(actual);
  const expectedOklch = parseOklchColor(expected);
  if (actualOklch && expectedOklch) {
    for (const index of [0, 1, 2] as const) {
      expect(actualOklch[index]).toBeCloseTo(expectedOklch[index], 4);
    }
    return;
  }

  expect(actual).toBe(expected);
}

test('NativeFS picker error keeps readable destructive colors in dark mode', async ({
  page,
}) => {
  await page.goto('/');
  await page.evaluate(() => {
    localStorage.setItem('color-scheme', 'dark');
  });
  await page.reload({ waitUntil: 'domcontentloaded' });

  await page.getByRole('button', { name: 'Create Workspace' }).click();
  await page
    .getByRole('radio', {
      name: 'Native File System Save workspace data in native file system',
    })
    .click();
  await page.getByRole('button', { name: 'Next' }).click();

  await page.getByRole('button', { name: 'Pick Directory' }).click();

  const errorMessage = page.getByText(
    /Please allow access to your folder to continue/i,
  );
  await expect(errorMessage).toBeVisible();
  await expectReadableContrast(errorMessage);

  const styles = await errorMessage.evaluate((element) => {
    const style = getComputedStyle(element);
    const normalizeColor = (color: string) => {
      const probe = document.createElement('span');
      probe.style.color = color;
      document.body.append(probe);
      const normalizedColor = getComputedStyle(probe).color;
      probe.remove();

      return normalizedColor;
    };

    return {
      backgroundColor: normalizeColor(style.backgroundColor),
      color: normalizeColor(style.color),
      destructive: normalizeColor(style.getPropertyValue('--destructive')),
      destructiveForeground: normalizeColor(
        style.getPropertyValue('--destructive-foreground'),
      ),
    };
  });

  expectCssColorEquivalent(styles.backgroundColor, styles.destructive);
  expectCssColorEquivalent(styles.color, styles.destructiveForeground);
});

test('contrast helper treats opaque rgb backgrounds as opaque', async ({
  page,
}) => {
  await page.setContent(`
    <div id="unreadable" style="color: rgb(0, 0, 0); background: rgb(0, 0, 0);">
      Unreadable text
    </div>
  `);

  await expect(
    expectReadableContrast(page.locator('#unreadable')),
  ).rejects.toThrow(/Expected readable contrast/);
});
