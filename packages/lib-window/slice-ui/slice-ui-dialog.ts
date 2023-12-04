import { createKey } from '@nalanda/core';

import type { AppDialog, AppDialogName } from '@bangle.io/dialog-maker';

const key = createKey('slice-ui-dialog', []);

const activeDialogField = key.field<AppDialog | undefined>(undefined);

function showDialog<T extends AppDialogName>(
  name: T,
  payload: Extract<AppDialog, { name: T }>['payload'],
) {
  const result = {
    name: name,
    payload,
  } as AppDialog;

  return activeDialogField.update(result);
}

/**
 * @param name pass undefined to clear any dialog or pass a specific name of the dialog to clear
 * @returns
 */
function clearDialog(name: AppDialogName | undefined) {
  if (!name) {
    return activeDialogField.update(undefined);
  }

  return activeDialogField.update((prev) => {
    if (prev?.name === name) {
      return undefined;
    }
    return prev;
  });
}

export const sliceUiDialog = key.slice({
  activeDialog: activeDialogField,
  showDialog,
  clearDialog,
});
