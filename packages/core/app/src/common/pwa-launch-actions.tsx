import { useCoreServices } from '@bangle.io/context';
import { WsPath } from '@bangle.io/ws-path';
import { useAtomValue, useSetAtom } from 'jotai';
import React from 'react';
import {
  consumePwaLaunchParams,
  subscribePwaLaunchIntents,
} from './pwa-install';

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

    if (
      activeWsName &&
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

    if (navigationTargetWsName) {
      return;
    }

    const recentWsName = recentWsPaths
      .map((entry) => WsPath.safeParse(entry.wsPath).data?.wsName)
      .find((wsName) => wsName !== undefined);
    const targetWsName = recentWsName ?? workspaces[0]?.name;
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
