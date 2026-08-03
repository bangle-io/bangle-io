export function shouldShowPwaOpenInAppPrompt(input: {
  alertDialogOpen: boolean;
  canOpenInApp: boolean;
  hasShown: boolean;
  installedThisSession: boolean;
  promptSeen: boolean;
}): boolean {
  return (
    !input.hasShown &&
    !input.promptSeen &&
    input.canOpenInApp &&
    !input.installedThisSession &&
    !input.alertDialogOpen
  );
}

export function createPwaOpenInAppPromptActions(input: {
  openInApp: () => void;
}) {
  return {
    onCancel: () => {},
    onContinue: input.openInApp,
  };
}
