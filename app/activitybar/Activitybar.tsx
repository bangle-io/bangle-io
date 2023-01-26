import React from 'react';

import { useBangleStoreContext } from '@bangle.io/bangle-store-context';
import { CHANGELOG_MODAL_NAME } from '@bangle.io/constants';
import { vars } from '@bangle.io/css-vars';
import { useExtensionRegistryContext } from '@bangle.io/extension-registry';
import { changeSidebar, useUIManagerContext } from '@bangle.io/slice-ui';
import {
  goToWorkspaceHomeRoute,
  useWorkspaceContext,
} from '@bangle.io/slice-workspace';
import { Button, GiftIcon, SingleCharIcon } from '@bangle.io/ui-components';
import { cx } from '@bangle.io/utils';

import { ActivitybarOptionsDropdown } from './ActivitybarOptionsDropdown';
import { ButtonStyleOBj } from './common';

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
        <Button
          ariaLabel={r.hint}
          key={r.name}
          onPress={() => {
            changeSidebar(r.name)(bangleStore.state, bangleStore.dispatch);
          }}
          style={{
            ...ButtonStyleOBj.normal,
            borderColor: active
              ? vars.color.promote.border
              : vars.misc.activitybarBg,
          }}
          onPressStyle={ButtonStyleOBj.press}
          onHoverStyle={ButtonStyleOBj.hover}
          className={cx('border-l-2', active && 'BU_is-active')}
          variant="transparent"
          size="lg"
          leftIcon={r.activitybarIcon}
        />
      );
    });

  return (
    <div
      data-testid="app-activitybar_activitybar"
      style={{
        backgroundColor: vars.misc.activitybarBg,
        color: vars.misc.activitybarText,
      }}
      className="flex flex-col flex-grow gap-2 pt-2 pb-3 border-r-1 border-colorNeutralBorder"
    >
      <Button
        ariaLabel="Workspace Home"
        style={ButtonStyleOBj.normal}
        onPressStyle={ButtonStyleOBj.press}
        onHoverStyle={ButtonStyleOBj.hover}
        onPress={() => {
          changeSidebar(null)(bangleStore.state, bangleStore.dispatch);
          goToWorkspaceHomeRoute()(bangleStore.state, bangleStore.dispatch);
        }}
        variant="transparent"
        tone="secondary"
        size="lg"
        leftIcon={
          <SingleCharIcon char={wsName?.[0]?.toLocaleUpperCase() || 'H'} />
        }
      />

      {sideBarComponents}
      <div className="flex-grow"></div>
      <Button
        ariaLabel="What's new"
        style={ButtonStyleOBj.normal}
        onPressStyle={ButtonStyleOBj.press}
        onHoverStyle={ButtonStyleOBj.hover}
        onPress={() => {
          dispatch({
            name: 'action::@bangle.io/slice-ui:SHOW_DIALOG',
            value: {
              dialogName: CHANGELOG_MODAL_NAME,
            },
          });
        }}
        variant="transparent"
        tone="secondary"
        size="lg"
        leftIcon={<GiftIcon showDot={changelogHasUpdates} />}
      />
      <ActivitybarOptionsDropdown
        operationKeybindings={operationKeybindings}
        widescreen={widescreen}
      />
    </div>
  );
}
