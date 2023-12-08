export const APP_DIALOG_NAME = {
  workspaceCreateBrowser: 'dialog::workspace:create-browser',
  workspaceCreateNativeFS: 'dialog::workspace:create-native-fs',
  workspaceCreateSelectTypeDialog: 'dialog::workspace:create:select-type',
  workspaceConfirmDelete: 'dialog::workspace:confirm-delete',
  workspaceAuthNativeFS: 'dialog::workspace:auth-native-fs',

  fileConfirmDelete: 'dialog::file:confirm-delete',
} as const;

export type AppDialogName =
  (typeof APP_DIALOG_NAME)[keyof typeof APP_DIALOG_NAME];

export type AppDialog =
  | {
      name: (typeof APP_DIALOG_NAME)['workspaceCreateBrowser'];
      payload: Record<string, never>;
    }
  | {
      name: (typeof APP_DIALOG_NAME)['workspaceCreateNativeFS'];
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
    }
  | {
      name: (typeof APP_DIALOG_NAME)['workspaceAuthNativeFS'];
      payload: {
        workspaceName: string;
      };
    };
