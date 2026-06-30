import type { BaseService } from '@bangle.io/base-utils';
import type {
  CommandDispatchService,
  CommandRegistryService,
  EditorService,
  FileSystemService,
  NavigationService,
  ShortcutService,
  UserActivityService,
  WorkbenchService,
  WorkbenchStateService,
  WorkspaceOpsService,
  WorkspaceService,
  WorkspaceStateService,
} from '@bangle.io/service-core';
import type { CommandExcludedServiceSlotId } from '@bangle.io/types';

export type PmEditorServiceContract = BaseService & {
  focusEditor: () => void;
  hasPendingOrFailedSave: (wsPath?: string) => boolean;
  mountEditor: (params: {
    domNode: HTMLElement;
    wsPath: string;
    name: string;
    focus?: boolean;
  }) => () => void;
  retryFailedSave: (wsPath: string) => boolean;
  subscribeToSaveStatus: (listener: () => void) => () => void;
};

export type CoreServices<
  TPmEditorService extends PmEditorServiceContract = PmEditorServiceContract,
> = {
  commandDispatcher: CommandDispatchService;
  commandRegistry: CommandRegistryService;
  editorService: EditorService;
  fileSystem: FileSystemService;
  navigation: NavigationService;
  pmEditorService: TPmEditorService;
  shortcut: ShortcutService;
  userActivityService: UserActivityService;
  workbench: WorkbenchService;
  workbenchState: WorkbenchStateService;
  workspace: WorkspaceService;
  workspaceOps: WorkspaceOpsService;
  workspaceState: WorkspaceStateService;
};

export type CommandExposedServices<
  TPmEditorService extends PmEditorServiceContract = PmEditorServiceContract,
> = Omit<CoreServices<TPmEditorService>, CommandExcludedServiceSlotId>;

export type Services<
  TPmEditorService extends PmEditorServiceContract = PmEditorServiceContract,
> = {
  core: CoreServices<TPmEditorService>;
};
