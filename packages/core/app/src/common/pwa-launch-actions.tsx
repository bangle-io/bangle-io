import { useCoreServices } from '@bangle.io/context';
import { WsPath } from '@bangle.io/ws-path';
import { useAtomValue, useSetAtom } from 'jotai';
import React from 'react';
import {
  consumePwaLaunchParams,
  subscribePwaLaunchIntents,
} from './pwa-install';

type Workspace = { name: string };
type RecentWsPath = { wsPath: string };

/** Chooses a currently available workspace for a manifest new-note launch. */
export function resolvePwaNewNoteWorkspace(input: {
  activeWsName: string | undefined;
  recentWsPaths: readonly RecentWsPath[];
  workspaces: readonly Workspace[];
}): string | undefined {
  const workspaceNames = new Set(
    input.workspaces.map((workspace) => workspace.name),
  );
  if (input.activeWsName && workspaceNames.has(input.activeWsName)) {
    return input.activeWsName;
  }

  const recent = input.recentWsPaths
    .map((entry) => WsPath.safeParse(entry.wsPath).data?.wsName)
    .find((wsName) => wsName !== undefined && workspaceNames.has(wsName));
  return recent ?? input.workspaces[0]?.name;
}

/**
 * Acts on PWA launches that need application services: manifest shortcuts
 * (`?shortcut=`). Deep-link hashes are applied to the URL by the pwa-install
 * module itself and handled by the hash router.
 */
export function PwaLaunchActions() {
  const {
    commandDispatcher,
    navigation,
    userActivityService,
    workbenchState,
    workspaceState,
  } = useCoreServices();
  const setOpenOmniSearch = useSetAtom(workbenchState.$openOmniSearch);
  const workspaces = useAtomValue(workspaceState.$workspaces);
  const recentWsPaths = useAtomValue(userActivityService.$allRecentWsPaths);
  const activeWsName = useAtomValue(navigation.$wsName);

  const [newNotePending, setNewNotePending] = React.useState(false);
  const [navigationTargetWsName, setNavigationTargetWsName] = React.useState<
    string | undefined
  >(undefined);

  React.useEffect(() => {
    consumePwaLaunchParams(window);

    return subscribePwaLaunchIntents((intent) => {
      if (intent.shortcut === 'search') {
        setOpenOmniSearch(true);
      }
      if (intent.shortcut === 'new-note') {
        setNewNotePending(true);
      }
    });
  }, [setOpenOmniSearch]);

  // "New note" shortcut: reuse the active workspace when there is one,
  // otherwise land in the most recently used workspace first, then open the
  // create-note dialog. With no workspaces at all the welcome page stays.
  React.useEffect(() => {
    if (!newNotePending) {
      return;
    }

    const activeWorkspaceIsAvailable =
      activeWsName &&
      workspaces.some((workspace) => workspace.name === activeWsName);
    if (
      activeWorkspaceIsAvailable &&
      (!navigationTargetWsName || activeWsName === navigationTargetWsName)
    ) {
      setNewNotePending(false);
      setNavigationTargetWsName(undefined);
      commandDispatcher.dispatch(
        'command::ui:create-note-dialog',
        { prefillName: undefined },
        'ui',
      );
      return;
    }

    if (
      navigationTargetWsName &&
      workspaces.some((workspace) => workspace.name === navigationTargetWsName)
    ) {
      return;
    }
    if (navigationTargetWsName) {
      setNavigationTargetWsName(undefined);
      return;
    }

    const targetWsName = resolvePwaNewNoteWorkspace({
      activeWsName,
      recentWsPaths,
      workspaces,
    });
    if (!targetWsName) {
      return;
    }

    setNavigationTargetWsName(targetWsName);
    navigation.goWorkspace(targetWsName);
  }, [
    newNotePending,
    activeWsName,
    navigationTargetWsName,
    recentWsPaths,
    workspaces,
    navigation,
    commandDispatcher,
  ]);

  return null;
}
