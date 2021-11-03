import React from 'react';
import { useHistory } from 'react-router-dom';

import type { SidebarType } from '@bangle.io/extension-registry';
import { GiftIcon, SingleCharIcon } from '@bangle.io/ui-components';
import { useUIManagerContext } from '@bangle.io/ui-context';

import { ActivitybarButton } from './ActivitybarButton';
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
    return (
      <ActivitybarButton
        active={sidebar === r.name}
        hint={r.hint}
        icon={React.cloneElement(r.icon, {
          className: (r.icon.props.className || '') + ' w-7 h-7',
        })}
        key={r.name}
        widescreen={widescreen}
        onActivate={() => {
          dispatch({
            type: 'UI/TOGGLE_SIDEBAR',
            value: { type: r.name },
          });
        }}
      />
    );
  });

  return (
    <div className="flex flex-grow flex-col activitybar">
      <ActivitybarButton
        widescreen={widescreen}
        onActivate={() => {
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
        widescreen={widescreen}
        onActivate={() => {
          dispatch({
            type: 'UI/SHOW_MODAL',
            value: { modal: '@modal/changelog' },
          });
        }}
        hint={"What's new"}
        icon={
          <GiftIcon
            className="text-gray-100 h-7 w-7"
            showDot={changelogHasUpdates}
          />
        }
      />
    </div>
  );
}
