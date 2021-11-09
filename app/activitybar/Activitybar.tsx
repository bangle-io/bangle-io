import React from 'react';
import { useHistory } from 'react-router-dom';

import type { SidebarType } from '@bangle.io/extension-registry';
import { MenuItem } from '@bangle.io/ui-bangle-button';
import {
  GiftIcon,
  SettingsIcon,
  SingleCharIcon,
} from '@bangle.io/ui-components';
import { useUIManagerContext } from '@bangle.io/ui-context';

import {
  ActivitybarButton,
  ActivitybarSettingsDropdown,
} from './ActivitybarButton';
import { ActivitybarMobile } from './ActivitybarMobile';

export function Activitybar({
  wsName,
  sidebars,
  primaryWsPath,
}: {
  wsName?: string;
  primaryWsPath?: string;
  sidebars: SidebarType[];
}) {
  const { changelogHasUpdates, sidebar, dispatch, widescreen } =
    useUIManagerContext();
  const history = useHistory();

  if (!widescreen) {
    return <ActivitybarMobile wsName={wsName} primaryWsPath={primaryWsPath} />;
  }

  const sidebarItems = sidebars.map((r) => {
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
          if (active) {
            dispatch({
              type: 'UI/TOGGLE_SIDEBAR',
              value: { type: r.name },
            });
          } else {
            dispatch({
              type: 'UI/CHANGE_SIDEBAR',
              value: { type: r.name },
            });
          }
        }}
      />
    );
  });

  return (
    <div className="flex flex-col flex-grow pt-2 pb-3 activitybar widescreen">
      <ActivitybarButton
        widescreen={widescreen}
        isActive={false}
        onPress={() => {
          dispatch({
            type: 'UI/CHANGE_SIDEBAR',
            value: { type: null },
          });
          history.push('/');
        }}
        hint="Workspace Home"
        icon={
          <SingleCharIcon
            char={wsName?.[0]?.toLocaleUpperCase() || ' '}
            className="w-8 h-8 text-gray-100"
          />
        }
      />

      {sidebarItems}
      <div className="flex-grow"></div>
      <ActivitybarButton
        isActive={false}
        widescreen={widescreen}
        icon={<GiftIcon className="h-7 w-7" showDot={changelogHasUpdates} />}
        hint={"What's new"}
        onPress={() => {
          dispatch({
            type: 'UI/SHOW_MODAL',
            value: { modal: '@modal/changelog' },
          });
        }}
      />
      <ActivitybarSettingsDropdown
        widescreen={widescreen}
        hint={'Configure'}
      ></ActivitybarSettingsDropdown>
    </div>
  );
}
