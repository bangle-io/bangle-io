import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@bangle.io/base-ui';
import * as React from 'react';

export interface AppAlertDialogProps {
  dialogId?: `dialog::${string}`;
  open: boolean;
  setOpen: (open: boolean) => void;
  title: string;
  description: string;
  cancelText?: string;
  continueText?: string;
  onCancel: () => void;
  onContinue: () => void;
  tone?: 'destructive' | 'default';
}

export function AppAlertDialog({
  dialogId,
  open,
  setOpen,
  title,
  description,
  cancelText = t.app.common.cancelButton,
  continueText = t.app.common.continueButton,
  onCancel,
  onContinue,
  tone = 'default',
}: AppAlertDialogProps) {
  // In the Base UI alert dialog, `AlertDialogCancel` is a `Close` (it closes the
  // dialog, routing through `onOpenChange`), while `AlertDialogAction` is a plain
  // button that does not close on its own. So any Base UI-initiated close (cancel
  // button, escape) is treated as a cancel, and the action button explicitly
  // confirms and closes via the controlled `open` prop (which does not re-enter
  // `onOpenChange`, so it never double-fires `onCancel`).
  const handleOpenChange = React.useCallback(
    (nextOpen: boolean) => {
      if (!nextOpen) {
        onCancel();
      }
      setOpen(nextOpen);
    },
    [onCancel, setOpen],
  );

  return (
    <AlertDialog key={dialogId} open={open} onOpenChange={handleOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel autoFocus={tone === 'destructive'}>
            {cancelText}
          </AlertDialogCancel>
          <AlertDialogAction
            autoFocus={tone !== 'destructive'}
            onClick={() => {
              onContinue();
              setOpen(false);
            }}
            variant={tone}
          >
            {continueText}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
