import { expect, test } from '@playwright/test';

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

  expect(styles.destructiveForeground).not.toBe(styles.destructive);
  expect(styles.color).not.toBe(styles.backgroundColor);
});
