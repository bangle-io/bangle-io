import React, { useCallback, useEffect } from 'react';

import { notification, ui, useSliceState } from '@bangle.io/api';
import { Severity } from '@bangle.io/constants';
import { NoteLink } from '@bangle.io/contextual-ui-components';
import { Dialog } from '@bangle.io/ui-components';

import { CONFLICT_DIALOG, ghSliceKey } from '../common';
import { manuallyResolveConflict } from '../operations';

export function ConflictDialog() {
  const { bangleStore } = ui.useUIManagerContext();

  const dismiss = useCallback(() => {
    ui.dismissDialog(CONFLICT_DIALOG)(bangleStore.state, bangleStore.dispatch);
  }, [bangleStore]);

  const {
    sliceState: { conflictedWsPaths, githubWsName },
  } = useSliceState(ghSliceKey);

  useEffect(() => {
    if (conflictedWsPaths.length === 0) {
      dismiss();

      notification.notificationSliceKey.callOp(
        bangleStore.state,
        bangleStore.dispatch,
        notification.showNotification({
          title: 'No Github conflicts',
          severity: Severity.INFO,
          uid: 'gh-conflict' + Date.now(),
          transient: true,
        }),
      );
    }
  }, [conflictedWsPaths, dismiss, bangleStore]);

  return (
    <Dialog
      isDismissable
      headingTitle="Github Conflict"
      onDismiss={dismiss}
      primaryButtonConfig={{
        text: 'Resolve Manually',
        onPress: () => {
          if (githubWsName) {
            ghSliceKey.callAsyncOp(
              bangleStore,
              manuallyResolveConflict(githubWsName),
            );
          }
          dismiss();
        },
      }}
      allowScroll
    >
      <p className="text-sm">
        Bangle was unable to sync the following files because of your local
        files and remote files have conflicting changes. This can happen if a
        file is modified at multiple places at simultaneously.
      </p>
      <ul className="list-disc list-inside py-3 pl-2 text-sm">
        {conflictedWsPaths.map((path) => (
          <li key={path}>
            <NoteLink
              className="cursor-pointer hover:underline"
              wsPath={path}
              onClick={dismiss}
            >
              {path}
            </NoteLink>
          </li>
        ))}
      </ul>
      <p className="text-sm">You can resolve this issue by doing:</p>
      <ol className="list-decimal list-inside py-2 pl-2 text-sm">
        <li className="mb-2">
          Clicking resolve will create a new file with the same name but ending
          with <code>-conflict</code> for each of the conflicting files and the
          original file will be reset to match contents of the remote file.
        </li>
        <li className="mb-2">
          The <code>-conflict</code> file will act as a reference to your local
          change, so that you do not loose any data.
        </li>
        <li className="mb-2">
          You can compare this file with the original file and make any
          necessary change to resolve the conflict.
        </li>
        <li className="mb-2">
          Once you have made changes to the original file, delete the
          <code>-conflict</code> files and sync again.
        </li>
      </ol>
    </Dialog>
  );
}
