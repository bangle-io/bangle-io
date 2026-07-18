import { useCoreServices } from '@bangle.io/context';
import { useAtom } from 'jotai';
import React from 'react';
import { usePwaInstall } from '../common/use-pwa-install';

/**
 * Shows a one-time alert dialog inviting the user to switch to the installed
 * PWA when the app is detected as installed but is being used from a plain
 * browser tab. Both accepting and dismissing persist the seen flag, so the
 * dialog appears at most once per browser profile; the sidebar pill and
 * settings row remain as the durable "Open in app" entry points.
 */
export function PwaOpenInAppPrompt() {
  const { workbenchState } = useCoreServices();
  const pwaInstall = usePwaInstall();
  const [promptSeen, setPromptSeen] = useAtom(
    workbenchState.$pwaOpenInAppPromptSeen,
  );
  const [alertDialog, setAlertDialog] = useAtom(workbenchState.$alertDialog);
  const hasShownRef = React.useRef(false);

  const { canOpenInApp, openInApp } = pwaInstall;

  React.useEffect(() => {
    // Never displace a dialog that is already open (e.g. a destructive
    // confirmation); retry when the shared alert slot frees up.
    if (
      hasShownRef.current ||
      promptSeen ||
      !canOpenInApp ||
      alertDialog !== undefined
    ) {
      return;
    }

    hasShownRef.current = true;
    setPromptSeen(true);
    setAlertDialog(() => ({
      dialogId: 'dialog::pwa-open-in-app',
      title: t.app.dialogs.pwaOpenInApp.title,
      description: t.app.dialogs.pwaOpenInApp.description,
      continueText: t.app.dialogs.pwaOpenInApp.continueText,
      cancelText: t.app.dialogs.pwaOpenInApp.cancelText,
      onContinue: () => {
        openInApp();
      },
      onCancel: () => {},
    }));
  }, [
    promptSeen,
    canOpenInApp,
    alertDialog,
    openInApp,
    setPromptSeen,
    setAlertDialog,
  ]);

  return null;
}
