import * as React from 'react';

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from './alert-dialog';

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
  cancelText = 'Cancel',
  continueText = 'Continue',
  onCancel,
  onContinue,
  tone = 'default',
}: AppAlertDialogProps) {
  return (
    <AlertDialog key={dialogId} open={open} onOpenChange={setOpen}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel
            autoFocus={tone === 'destructive'}
            onClick={onCancel}
          >
            {cancelText}
          </AlertDialogCancel>
          <AlertDialogAction
            autoFocus={tone !== 'destructive'}
            onClick={onContinue}
            variant={tone}
          >
            {continueText}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
