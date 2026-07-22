import { useCoreServices } from '@bangle.io/context';
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
 * (detected through the storage version handshake). The only way forward is a
 * reload, which loads the current app version; the dialog is deliberately
 * non-dismissable.
 */
export function StaleTabDialog() {
  const { workbenchState } = useCoreServices();
  const staleTab = useAtomValue(workbenchState.$staleTab);

  if (!staleTab) {
    return null;
  }

  return (
    <AlertDialog open>
      <AlertDialogContent data-testid="stale-tab-dialog">
        <AlertDialogHeader>
          <AlertDialogTitle>{t.app.dialogs.staleTab.title}</AlertDialogTitle>
          <AlertDialogDescription>
            {t.app.dialogs.staleTab.description}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <Button
            data-testid="stale-tab-reload"
            onClick={() => {
              window.location.reload();
            }}
            type="button"
          >
            <RefreshCw aria-hidden className="h-4 w-4" />
            {t.app.dialogs.staleTab.reloadButton}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
