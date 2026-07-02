import stories from '@bangle.io/ui-components/src/dialog-input-and-select.stories.portable';
import { expect, test } from '@playwright/experimental-ct-react';
import React from 'react';

test('single input dialog exposes a direct form flow', async ({
  mount,
  page,
}) => {
  await mount(<stories.CreateNoteInput />);

  const dialog = page.getByRole('dialog', { name: 'Create Note' });
  await expect(dialog).toBeVisible();
  await expect(dialog.getByText('Name the note')).toBeVisible();
  await expect(dialog.getByLabel('Note name')).toHaveAttribute(
    'placeholder',
    'Untitled note',
  );
  await expect(dialog.getByRole('button', { name: 'Create' })).toBeDisabled();

  await dialog.getByLabel('Note name').fill('meeting-notes');
  await dialog.getByRole('button', { name: 'Create' }).click();

  await expect(page.getByLabel('Submitted note name')).toHaveText(
    'meeting-notes',
  );
  await expect(dialog).toBeHidden();
});

test('single select keeps input focus model and scrolls active option', async ({
  mount,
  page,
}) => {
  await mount(<stories.LongSingleSelect />);

  const dialog = page.getByRole('dialog', { name: 'Move Note' });
  await expect(
    dialog.getByRole('combobox', { name: 'Find a folder' }),
  ).toBeFocused();

  const cancelButton = dialog.getByRole('button', { name: 'Cancel' });
  for (let index = 0; index < 4; index += 1) {
    expect(
      await page.evaluate(() => document.activeElement?.getAttribute('role')),
    ).not.toBe('option');

    if (
      await cancelButton.evaluate(
        (element) => element === document.activeElement,
      )
    ) {
      break;
    }

    await page.keyboard.press('Tab');
  }
  await expect(cancelButton).toBeFocused();

  await dialog.getByRole('combobox', { name: 'Find a folder' }).focus();

  for (let index = 0; index < 30; index += 1) {
    await page.keyboard.press('ArrowDown');
  }

  const listbox = dialog.locator('[cmdk-list]');
  const activeOption = dialog.locator('[cmdk-item][data-selected="true"]');

  await expect(activeOption).toContainText('Folder');
  await expect
    .poll(async () => {
      const listBounds = await listbox.boundingBox();
      const optionBounds = await activeOption.boundingBox();

      if (!listBounds || !optionBounds) {
        return false;
      }

      return (
        optionBounds.y >= listBounds.y &&
        optionBounds.y + optionBounds.height <= listBounds.y + listBounds.height
      );
    })
    .toBe(true);
});
