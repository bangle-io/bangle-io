import { useCoreServices } from '@bangle.io/context';
import type { RecentWsPathsReadResult } from '@bangle.io/service-core';
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
  const workspaceListState = useAtomValue(workspaceState.$workspaceListState);
  const workspaces = workspaceListState.data;
  const activeWsName = useAtomValue(navigation.$wsName);

  const [newNotePending, setNewNotePending] = React.useState(false);
  const [recentWsPathsRead, setRecentWsPathsRead] = React.useState<
    RecentWsPathsReadResult | null | undefined
  >(undefined);
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
        setRecentWsPathsRead(undefined);
        setNewNotePending(true);
      }
    });
  }, [setOpenOmniSearch]);

  // "New note" shortcut: reuse the active workspace when there is one,
  // otherwise land in the most recently used workspace first, then open the
  // create-note dialog. With no workspaces at all the welcome page stays.
  React.useEffect(() => {
    if (!newNotePending) {
      return undefined;
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
      return undefined;
    }

    if (
      navigationTargetWsName &&
      workspaces.some((workspace) => workspace.name === navigationTargetWsName)
    ) {
      return undefined;
    }
    if (navigationTargetWsName) {
      setNavigationTargetWsName(undefined);
      return undefined;
    }

    if (workspaceListState.status !== 'ready') {
      return undefined;
    }
    if (recentWsPathsRead === undefined) {
      let canceled = false;
      void userActivityService.readRecentWsPathsAcrossWorkspaces().then(
        (result) => {
          if (!canceled) {
            setRecentWsPathsRead(result);
          }
        },
        () => {
          if (!canceled) {
            setRecentWsPathsRead(null);
          }
        },
      );
      return () => {
        canceled = true;
      };
    }
    if (recentWsPathsRead?.status !== 'complete') {
      // Partial activity cannot identify the true newest workspace. Keep the
      // shortcut pending instead of opening a create dialog against a guessed
      // fallback workspace; a later launch can start a fresh authoritative
      // read.
      return undefined;
    }

    const targetWsName = resolvePwaNewNoteWorkspace({
      activeWsName,
      recentWsPaths: recentWsPathsRead.recentWsPaths,
      workspaces,
    });
    if (!targetWsName) {
      return undefined;
    }

    setNavigationTargetWsName(targetWsName);
    navigation.goWorkspace(targetWsName);
    return undefined;
  }, [
    newNotePending,
    activeWsName,
    navigationTargetWsName,
    recentWsPathsRead,
    workspaceListState.status,
    workspaces,
    navigation,
    commandDispatcher,
    userActivityService,
  ]);

  return null;
}
