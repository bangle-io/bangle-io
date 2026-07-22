import { EDITOR_SAVE_DRAIN_TIMEOUT_MS } from '@bangle.io/constants';
import { useCoreServices } from '@bangle.io/context';
import { waitForSaveQueueToDrain } from '@bangle.io/service-core';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  Button,
} from '@bangle.io/ui-components';
import { useAtomValue } from 'jotai';
import { RefreshCw } from 'lucide-react';
import React from 'react';

/**
 * Blocks a tab that is known to run an older app version than another tab
 * (detected through the app build handshake). The only way forward is a
 * reload, which loads the current app version; the dialog is deliberately
 * non-dismissable.
 */
export function StaleTabDialog() {
  const { editorEngine, workbenchState } = useCoreServices();
  const staleTab = useAtomValue(workbenchState.$staleTab);
  const [reloadState, setReloadState] = React.useState<
    'idle' | 'waiting' | 'blocked'
  >('idle');

  if (!staleTab) {
    return null;
  }

  return (
    <AlertDialog open>
      <AlertDialogContent data-testid="stale-tab-dialog">
        <AlertDialogHeader>
          <AlertDialogTitle>{t.app.dialogs.staleTab.title}</AlertDialogTitle>
          <AlertDialogDescription>
            {reloadState === 'blocked'
              ? t.app.dialogs.staleTab.saveBlocked
              : t.app.dialogs.staleTab.description}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <Button
            data-testid="stale-tab-reload"
            disabled={reloadState === 'waiting'}
            onClick={async () => {
              setReloadState('waiting');
              editorEngine.retryFailedSave();
              const drained = await waitForSaveQueueToDrain(
                editorEngine,
                EDITOR_SAVE_DRAIN_TIMEOUT_MS,
              );
              if (!drained) {
                setReloadState('blocked');
                return;
              }
              window.location.reload();
            }}
            type="button"
          >
            <RefreshCw aria-hidden className="h-4 w-4" />
            {reloadState === 'waiting'
              ? t.app.dialogs.staleTab.savingButton
              : reloadState === 'blocked'
                ? t.app.dialogs.staleTab.retryButton
                : t.app.dialogs.staleTab.reloadButton}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
