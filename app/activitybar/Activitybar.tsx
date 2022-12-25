import React from 'react';

import { vars } from '@bangle.io/atomic-css';
import { useBangleStoreContext } from '@bangle.io/bangle-store-context';
import { CHANGELOG_MODAL_NAME } from '@bangle.io/constants';
import { useExtensionRegistryContext } from '@bangle.io/extension-registry';
import { changeSidebar, useUIManagerContext } from '@bangle.io/slice-ui';
import {
  goToWorkspaceHomeRoute,
  useWorkspaceContext,
} from '@bangle.io/slice-workspace';
import { GiftIcon, SingleCharIcon } from '@bangle.io/ui-components';

import { ActivitybarButton } from './ActivitybarButton';
import { ActivitybarOptionsDropdown } from './ActivitybarOptionsDropdown';

export function Activitybar() {
  const extensionRegistry = useExtensionRegistryContext();
  const operationKeybindings =
    extensionRegistry.getSerialOperationKeybindingMapping();
  const { wsName } = useWorkspaceContext();
  const sidebars = extensionRegistry.getSidebars();
  const { changelogHasUpdates, sidebar, dispatch, widescreen } =
    useUIManagerContext();
  const bangleStore = useBangleStoreContext();

  const sideBarComponents = sidebars
    .filter((r) => {
      return r.activitybarIconShow
        ? r.activitybarIconShow(wsName, bangleStore.state)
        : true;
    })
    .map((r) => {
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

  return (
    <div
      data-testid="app-activitybar_activitybar"
      style={{
        backgroundColor: vars.color.app.activitybarBg,
        color: vars.color.app.activitybarText,
      }}
      className="flex flex-col flex-grow pt-2 pb-3 border-r-1 border-colorNeutralBorder"
    >
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
