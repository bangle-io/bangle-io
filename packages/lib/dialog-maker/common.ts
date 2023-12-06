export const APP_DIALOG_NAME = {
  workspaceCreate: 'dialog::workspace:create',
  workspaceCreateSelectTypeDialog: 'dialog::workspace:create:select-type',

  workspaceConfirmDelete: 'dialog::workspace:confirm-delete',
  fileConfirmDelete: 'dialog::file:confirm-delete',
} as const;

export type AppDialogName =
  (typeof APP_DIALOG_NAME)[keyof typeof APP_DIALOG_NAME];

export type AppDialog =
  | {
      name: (typeof APP_DIALOG_NAME)['workspaceCreate'];
      payload: Record<string, never>;
    }
  | {
      name: (typeof APP_DIALOG_NAME)['workspaceCreateSelectTypeDialog'];
      payload: Record<string, never>;
    }
  | {
      name: (typeof APP_DIALOG_NAME)['workspaceConfirmDelete'];
      payload: {
        workspaceName: string;
      };
    }
  | {
      name: (typeof APP_DIALOG_NAME)['fileConfirmDelete'];
      payload: {
        wsPath: string;
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
