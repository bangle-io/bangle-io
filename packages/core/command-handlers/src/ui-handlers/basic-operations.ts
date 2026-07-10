import { throwAppError } from '@bangle.io/base-utils';
import {
  EDITOR_ENGINE_IDS,
  EDITOR_ENGINE_SWITCH_SAVE_DRAIN_TIMEOUT_MS,
  isEditorEngineId,
} from '@bangle.io/constants';
import { waitForSaveQueueToDrain } from '@bangle.io/service-core';
import { toast } from '@bangle.io/ui-components';
import { FlaskConical, Sun } from 'lucide-react';
import { c, getCtx } from '../helper';
import { readTextFromClipboard, writeTextToClipboard } from '../utils';

export const basicOperationsHandlers = [
  c('command::ui:toggle-sidebar', ({ workbenchState }, _, key) => {
    const { store } = getCtx(key);
    store.set(workbenchState.$sidebarOpen, (prev) => !prev);
  }),

  c(
    'command::ui:toggle-omni-search',
    ({ workbenchState }, { prefill }, key) => {
      const { store } = getCtx(key);
      store.set(workbenchState.$openOmniSearch, (prev) => !prev);
      if (prefill) {
        store.set(workbenchState.$omniSearchInput, prefill);
      }
    },
  ),

  c('command::ui:switch-theme', ({ workbenchState }, _, key) => {
    const { store, dispatch } = getCtx(key);
    const currentPref = store.get(workbenchState.$themePref);
    const system = 'system' as const;
    const light = 'light' as const;
    const dark = 'dark' as const;

    store.set(workbenchState.$singleSelectDialog, () => {
      return {
        dialogId: 'dialog::change-theme-pref-dialog',
        title: t.app.dialogs.changeTheme.title,
        description: t.app.dialogs.changeTheme.searchPlaceholder,
        searchPlaceholder: t.app.dialogs.changeTheme.searchPlaceholder,
        groupLabel: t.app.dialogs.changeTheme.groupLabel,
        emptyMessage: t.app.dialogs.changeTheme.emptyMessage,
        options: [
          {
            title: t.app.dialogs.changeTheme.options.system,
            id: 'system',
            active: currentPref === system,
          },
          {
            title: t.app.dialogs.changeTheme.options.light,
            id: 'light',
            active: currentPref === light,
          },
          {
            title: t.app.dialogs.changeTheme.options.dark,
            id: 'dark',
            active: currentPref === dark,
          },
        ],
        Icon: Sun,
        onSelect: (option) => {
          if (
            option.id === system ||
            option.id === light ||
            option.id === dark
          ) {
            workbenchState.changeThemePreference(option.id);
            dispatch('command::ui:focus-editor', null);
          }
        },
      };
    });
  }),

  c('command::ui:reload-app', ({ workbenchState }) => {
    workbenchState.reloadUi();
  }),

  c(
    'command::ui:switch-editor-engine',
    ({ workbenchState, editorEngine }, _, key) => {
      const { store } = getCtx(key);
      const currentEngine = editorEngine.engineId;

      store.set(workbenchState.$singleSelectDialog, () => {
        return {
          dialogId: 'dialog::switch-editor-engine-dialog',
          title: t.app.dialogs.switchEditorEngine.title,
          description: t.app.dialogs.switchEditorEngine.description,
          searchPlaceholder: t.app.dialogs.switchEditorEngine.searchPlaceholder,
          groupLabel: t.app.dialogs.switchEditorEngine.groupLabel,
          emptyMessage: t.app.dialogs.switchEditorEngine.emptyMessage,
          options: EDITOR_ENGINE_IDS.map((engineId) => ({
            title: t.app.dialogs.switchEditorEngine.options[engineId],
            id: engineId,
            active: currentEngine === engineId,
          })),
          Icon: FlaskConical,
          onSelect: (option) => {
            if (!isEditorEngineId(option.id) || option.id === currentEngine) {
              return;
            }
            const targetEngine = option.id;
            // Switching is a reload; unsaved content must reach storage
            // first, and a failed save must block the switch entirely.
            void (async () => {
              const drained = await waitForSaveQueueToDrain(
                editorEngine,
                EDITOR_ENGINE_SWITCH_SAVE_DRAIN_TIMEOUT_MS,
              );
              if (!drained) {
                toast.error(t.app.toasts.editorEngineSwitchBlockedBySaves);
                return;
              }
              if (!workbenchState.changeEditorEnginePreference(targetEngine)) {
                toast.error(t.app.toasts.editorEngineSwitchPreferenceFailed);
                return;
              }
              workbenchState.reloadUi();
            })();
          },
        };
      });
    },
  ),

  c('command::ui:open-settings', ({ navigation }) => {
    navigation.goSettingsPage('settings-general');
  }),

  c('command::ui:open-settings-general', ({ navigation }) => {
    navigation.goSettingsPage('settings-general');
  }),

  c('command::ui:open-settings-workspaces', ({ navigation }) => {
    navigation.goSettingsPage('settings-workspaces');
  }),

  c(
    'command::ui:toggle-all-files',
    ({ workbenchState }, { prefillInput }, key) => {
      const { store } = getCtx(key);
      store.set(workbenchState.$openAllFiles, (prev) => !prev);
      if (prefillInput) {
        store.set(workbenchState.$allFilesSearchInput, prefillInput);
      }
    },
  ),

  c(
    'command::ui:toggle-wide-editor',
    ({ workbenchState, workspaceState }, _, key) => {
      const { store } = getCtx(key);
      const currentWsPath = store.get(workspaceState.$currentWsPath);
      if (!currentWsPath) {
        throwAppError(
          'error::workspace:not-opened',
          t.app.errors.workspace.noNoteOpenCannotToggleWideEditor,
          {},
        );
      }
      // Note is open, toggle the wide editor
      store.set(workbenchState.$wideEditor, (prev) => !prev);
    },
  ),

  c('command::ui:focus-editor', ({ workspaceState, editorEngine }, _, key) => {
    const { store } = getCtx(key);
    const currentWsPath = store.get(workspaceState.$currentWsPath);

    if (!currentWsPath) {
      return;
    }

    editorEngine.focusEditor();
  }),

  c('command::ui:copy-selection-as-markdown', async ({ editorEngine }) => {
    const markdown = editorEngine.getSelectionMarkdown();
    if (!markdown) {
      toast.error(t.app.toasts.selectionCopyEmpty);
      return;
    }
    try {
      await writeTextToClipboard(markdown);
      toast.success(t.app.toasts.selectionCopied);
    } catch {
      toast.error(t.app.toasts.selectionCopyFailed);
    }
  }),

  c('command::ui:paste-from-markdown', async ({ editorEngine }) => {
    let text: string;
    try {
      text = await readTextFromClipboard();
    } catch {
      toast.error(t.app.toasts.pasteMarkdownFailed);
      return;
    }
    if (!text.trim()) {
      toast.error(t.app.toasts.pasteMarkdownEmpty);
      return;
    }
    if (!editorEngine.insertMarkdownAtSelection(text)) {
      toast.error(t.app.toasts.pasteMarkdownFailed);
    }
  }),

  c('command::ui:toggle-heading-collapse', ({ editorEngine }) => {
    editorEngine.toggleHeadingCollapse();
  }),

  c('command::ui:uncollapse-all-headings', ({ editorEngine }) => {
    editorEngine.uncollapseAllHeadings();
  }),

  c('command::ui:collapse-all-headings-1', ({ editorEngine }) => {
    editorEngine.collapseAllHeadings(1);
  }),

  c('command::ui:collapse-all-headings-2', ({ editorEngine }) => {
    editorEngine.collapseAllHeadings(2);
  }),

  c('command::ui:collapse-all-headings-3', ({ editorEngine }) => {
    editorEngine.collapseAllHeadings(3);
  }),
];
