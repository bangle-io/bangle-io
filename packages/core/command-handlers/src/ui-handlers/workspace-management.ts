import { requestNativeBrowserFSPermission } from '@bangle.io/baby-fs';
import { throwAppError } from '@bangle.io/base-utils';
import { toast } from '@bangle.io/ui-components';
import { Briefcase, Trash2 } from 'lucide-react';
import { c, getCtx } from '../helper';

export const workspaceManagementHandlers = [
  c('command::ui:create-workspace-dialog', ({ workbenchState }, _, key) => {
    const { store } = getCtx(key);
    store.set(workbenchState.$openWsDialog, (prev) => !prev);
  }),

  c(
    'command::ui:switch-workspace',
    ({ workbenchState, workspaceState, navigation }, _, key) => {
      const { store } = getCtx(key);
      const workspaces = store.get(workspaceState.$workspaces);

      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

      store.set(workbenchState.$singleSelectDialog, () => {
        return {
          dialogId: 'dialog::switch-workspace-dialog',
          placeholder: t.app.dialogs.switchWorkspace.placeholder,
          badgeText: t.app.dialogs.switchWorkspace.badgeText,
          groupHeading: t.app.dialogs.switchWorkspace.groupHeading,
          emptyMessage: t.app.dialogs.switchWorkspace.emptyMessage,
          options: (workspaces || [])
            .sort((a, b) => {
              const aRecent = new Date(a.lastModified) >= sevenDaysAgo;
              const bRecent = new Date(b.lastModified) >= sevenDaysAgo;

              if (aRecent && !bRecent) return -1;
              if (!aRecent && bRecent) return 1;
              if (aRecent && bRecent) {
                return (
                  new Date(b.lastModified).getTime() -
                  new Date(a.lastModified).getTime()
                );
              }
              return a.name.localeCompare(b.name);
            })
            .map((ws) => ({
              title: ws.name,
              id: `${ws.type}-${ws.name}`,
            })),
          Icon: Briefcase,
          onSelect: (option) => {
            navigation.goWorkspace(option.title);
          },
        };
      });
    },
  ),

  c(
    'command::ui:delete-workspace-dialog',
    ({ workbenchState, workspaceState }, _, key) => {
      const { store, dispatch } = getCtx(key);
      const workspaces = store.get(workspaceState.$workspaces);

      store.set(workbenchState.$singleSelectDialog, () => {
        return {
          dialogId: 'dialog::delete-workspace-dialog',
          placeholder: t.app.dialogs.deleteWorkspace.placeholder,
          badgeText: t.app.dialogs.deleteWorkspace.badgeText,
          badgeTone: 'destructive',
          groupHeading: t.app.dialogs.deleteWorkspace.groupHeading,
          emptyMessage: t.app.dialogs.deleteWorkspace.emptyMessage,
          options: (workspaces || []).map((ws) => ({
            title: ws.name,
            id: `${ws.type}-${ws.name}`,
          })),
          Icon: Trash2,
          onSelect: (option) => {
            const wsName = option.title;
            if (wsName) {
              store.set(workbenchState.$alertDialog, () => {
                return {
                  dialogId: 'dialog::alert-delete-workspace',
                  title: t.app.dialogs.confirmDeleteWorkspace.title,
                  tone: 'destructive',
                  description: t.app.dialogs.confirmDeleteWorkspace.description(
                    { wsName },
                  ),
                  continueText:
                    t.app.dialogs.confirmDeleteWorkspace.continueText,
                  onContinue: () => {
                    dispatch('command::ws:delete-workspace', { wsName });
                  },
                  onCancel: () => {},
                };
              });
            }
          },
        };
      });
    },
  ),

  c(
    'command::ui:native-fs-auth',
    (
      { workspaceOps, navigation, workbenchState, editorService },
      { wsName },
      key,
    ) => {
      const { store } = getCtx(key);

      workspaceOps.getWorkspaceMetadata(wsName).then(({ rootDirHandle }) => {
        if (!rootDirHandle) {
          throwAppError(
            'error::workspace:invalid-metadata',
            t.app.errors.workspace.invalidMetadata({ wsName }),
            { wsName },
          );
        }

        let attempt = 0;

        const failAndGoToHome = () => {
          toast.error(t.app.toasts.permissionNotGranted, {
            duration: 5000,
            cancel: {
              label: t.app.common.dismiss,
              onClick: () => {},
            },
          });
          navigation.goHome();
        };

        const onNotGranted = () => {
          queueMicrotask(() => {
            if (attempt++ > 2) {
              failAndGoToHome();
              return;
            }
            store.set(workbenchState.$alertDialog, {
              dialogId: 'dialog::workspace:native-fs-auth-needed',
              title: t.app.dialogs.nativeFsAuth.title,
              description: t.app.dialogs.nativeFsAuth.descriptionRetry({
                wsName,
              }),
              continueText: t.app.dialogs.nativeFsAuth.continueTextRetry,
              onContinue,
              onCancel: () => {
                failAndGoToHome();
              },
            });
          });
        };

        const onContinue = async () => {
          const granted = await requestNativeBrowserFSPermission(rootDirHandle);

          if (!granted) {
            onNotGranted();
            return;
          }

          editorService.onNativeFsAuthSuccess(wsName);
          navigation.goWorkspace(wsName, { skipIfAlreadyThere: true });
        };

        store.set(workbenchState.$alertDialog, {
          dialogId: 'dialog::workspace:native-fs-auth-needed',
          title: t.app.dialogs.nativeFsAuth.title,
          description: t.app.dialogs.nativeFsAuth.descriptionInitial({
            wsName,
          }),
          continueText: t.app.dialogs.nativeFsAuth.continueTextInitial,
          onContinue,
          onCancel: () => {
            failAndGoToHome();
          },
        });
      });
    },
  ),
];
