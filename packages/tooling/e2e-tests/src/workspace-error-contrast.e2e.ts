import { expect, test } from '@playwright/test';
import { expectReadableContrast } from './common';

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
    return {
      backgroundColor: style.backgroundColor,
      color: style.color,
      destructive: style.getPropertyValue('--destructive').trim(),
      destructiveForeground: style
        .getPropertyValue('--destructive-foreground')
        .trim(),
    };
  });

  expect(styles.backgroundColor).toBe(styles.destructive);
  expect(styles.color).toBe(styles.destructiveForeground);
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
