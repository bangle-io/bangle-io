import React from 'react';

import { AppDialog, AppDialogName } from '@bangle.io/dialog-maker';

export function registerDialogComponent<T extends AppDialogName>(
  dialogRegistry: Record<string, (props: AppDialog) => React.ReactNode>,
  name: T,
  component: (props: Extract<AppDialog, { name: T }>) => React.ReactNode,
): void {
  (dialogRegistry as any)[name] = component;
}
