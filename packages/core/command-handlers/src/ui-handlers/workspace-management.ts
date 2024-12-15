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
          placeholder: 'Select a workspace to switch',
          badgeText: 'Switch Workspace',
          groupHeading: 'Workspaces',
          emptyMessage: 'No workspaces found',
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
          placeholder: 'Select a workspace to delete',
          badgeText: 'Delete Workspace',
          badgeTone: 'destructive',
          groupHeading: 'Workspaces',
          emptyMessage: 'No workspaces found',
          options: (workspaces || []).map((ws) => ({
            title: ws.name,
            id: `${ws.type}-${ws.name}`,
          })),
          Icon: Trash2,
          onSelect: (option) => {
            const wsName = option.title;
            if (
              wsName &&
              confirm(
                `Are you sure you want to delete the workspace "${wsName}"? This action cannot be undone.`,
              )
            ) {
              dispatch('command::ws:delete-workspace', { wsName });
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
            `Invalid workspace metadata for ${wsName}. Missing root dir handle`,
            { wsName },
          );
        }

        let attempt = 0;

        const failAndGoToHome = () => {
          toast.error('Permission not granted', {
            duration: 5000,
            cancel: {
              label: 'Dismiss',
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
              title: 'Grant permission?',
              description: `That didn't work. Bangle.io needs your permission to access "${wsName}"`,
              continueText: 'Try Again',
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
          title: 'Grant permission?',
          description: `Bangle.io needs your permission to access "${wsName}"`,
          continueText: 'Grant',
          onContinue,
          onCancel: () => {
            failAndGoToHome();
          },
        });
      });
    },
  ),
];
