import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@bangle.io/shadcn';
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
  const handledActionRef = React.useRef(false);

  const handleOpenChange = React.useCallback(
    (nextOpen: boolean) => {
      if (!nextOpen && !handledActionRef.current) {
        onCancel();
      }
      handledActionRef.current = false;
      setOpen(nextOpen);
    },
    [onCancel, setOpen],
  );

  return (
    <AlertDialog key={dialogId} open={open} onOpenChange={handleOpenChange}>
      <AlertDialogContent autoFocus>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel
            autoFocus={tone === 'destructive'}
            onClick={() => {
              handledActionRef.current = true;
              onCancel();
            }}
          >
            {cancelText}
          </AlertDialogCancel>
          <AlertDialogAction
            autoFocus={tone !== 'destructive'}
            onClick={() => {
              handledActionRef.current = true;
              onContinue();
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
