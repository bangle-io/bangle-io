export const APP_DIALOG_NAME = {
  workspaceCreate: 'dialog::workspace:create',
  workspaceConfirmDelete: 'dialog::workspace:confirm-delete',
} as const;

export type AppDialogName =
  (typeof APP_DIALOG_NAME)[keyof typeof APP_DIALOG_NAME];

export type AppDialog =
  | {
      name: (typeof APP_DIALOG_NAME)['workspaceCreate'];
      payload: Record<string, never>;
    }
  | {
      name: (typeof APP_DIALOG_NAME)['workspaceConfirmDelete'];
      payload: {
        workspaceName: string;
      };
    };

export function dialogMaker<T extends AppDialogName>(
  name: T,
  payload: Extract<AppDialog, { name: T }>['payload'],
): AppDialog {
  const result = {
    name,
    payload,
  };
  return result as any;
}
