import React, { useMemo } from 'react';

import { CHANGELOG_MODAL_NAME } from '@bangle.io/constants';
import type { SidebarType } from '@bangle.io/extension-registry';
import type { SerialOperationKeybindingMapping } from '@bangle.io/shared-types';
import { changeSidebar, useUIManagerContext } from '@bangle.io/slice-ui';
import {
  goToWorkspaceHomeRoute,
  useWorkspaceContext,
} from '@bangle.io/slice-workspace';
import { GiftIcon, SingleCharIcon } from '@bangle.io/ui-components';

import { ActivitybarButton } from './ActivitybarButton';
import { ActivitybarMobile } from './ActivitybarMobile';
import { ActivitybarOptionsDropdown } from './ActivitybarOptionsDropdown';

export function Activitybar({
  wsName,
  sidebars,
  primaryWsPath,
  operationKeybindings,
}: {
  wsName?: string;
  primaryWsPath?: string;
  sidebars: SidebarType[];
  operationKeybindings: SerialOperationKeybindingMapping;
}) {
  const { changelogHasUpdates, sidebar, dispatch, widescreen } =
    useUIManagerContext();
  const { bangleStore } = useWorkspaceContext();

  const sidebarItems = useMemo(() => {
    return sidebars.filter((r) => {
      return r.activitybarIconShow
        ? r.activitybarIconShow(wsName, bangleStore.state)
        : true;
    });
  }, [sidebars, bangleStore, wsName]);

  const sideBarComponents = useMemo(() => {
    return sidebarItems.map((r) => {
      const active = sidebar === r.name;

      return (
        <ActivitybarButton
          isActive={active}
          hint={r.hint}
          icon={React.cloneElement(r.activitybarIcon, {
            className: (r.activitybarIcon.props.className || '') + ' w-7 h-7',
          })}
          key={r.name}
          widescreen={widescreen}
          onPress={() => {
            changeSidebar(r.name)(bangleStore.state, bangleStore.dispatch);
          }}
        />
      );
    });
  }, [sidebarItems, bangleStore, sidebar, widescreen]);

  if (!widescreen) {
    return (
      <ActivitybarMobile
        operationKeybindings={operationKeybindings}
        wsName={wsName}
        primaryWsPath={primaryWsPath}
        sidebarItems={sidebarItems}
        activeSidebar={sidebar || undefined}
      />
    );
  }

  return (
    <div className="flex flex-col flex-grow pt-2 pb-3 B-activitybar_activitybar BU_widescreen">
      <ActivitybarButton
        widescreen={widescreen}
        isActive={false}
        onPress={() => {
          changeSidebar(null)(bangleStore.state, bangleStore.dispatch);
          goToWorkspaceHomeRoute()(bangleStore.state, bangleStore.dispatch);
        }}
        hint="Workspace Home"
        icon={
          <SingleCharIcon
            char={wsName?.[0]?.toLocaleUpperCase() || ' '}
            className="w-8 h-8 text-gray-100"
          />
        }
      />

      {sideBarComponents}
      <div className="flex-grow"></div>
      <ActivitybarButton
        isActive={false}
        widescreen={widescreen}
        icon={<GiftIcon className="h-7 w-7" showDot={changelogHasUpdates} />}
        hint={"What's new"}
        onPress={() => {
          dispatch({
            name: 'action::@bangle.io/slice-ui:SHOW_DIALOG',
            value: {
              dialogName: CHANGELOG_MODAL_NAME,
            },
          });
        }}
      />
      <ActivitybarOptionsDropdown
        operationKeybindings={operationKeybindings}
        widescreen={widescreen}
      />
    </div>
  );
}
