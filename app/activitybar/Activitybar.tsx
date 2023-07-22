import React from 'react';

import { useNsmSlice, useNsmSliceState } from '@bangle.io/bangle-store-context';
import { CHANGELOG_MODAL_NAME } from '@bangle.io/constants';
import { vars } from '@bangle.io/css-vars';
import { useExtensionRegistryContext } from '@bangle.io/extension-registry';
import { nsmSliceWorkspace } from '@bangle.io/nsm-slice-workspace';
import { goToWorkspaceHome, nsmPageSlice } from '@bangle.io/slice-page';
import { nsmUI, nsmUISlice } from '@bangle.io/slice-ui';
import { Button, GiftIcon, SingleCharIcon } from '@bangle.io/ui-components';
import { cx } from '@bangle.io/utils';

import { ActivitybarOptionsDropdown } from './ActivitybarOptionsDropdown';
import { ButtonStyleOBj } from './common';

export function Activitybar() {
  const extensionRegistry = useExtensionRegistryContext();
  const operationKeybindings =
    extensionRegistry.getSerialOperationKeybindingMapping();
  const { wsName } = useNsmSliceState(nsmSliceWorkspace);
  const [, pageDispatch] = useNsmSlice(nsmPageSlice);

  const sidebars = extensionRegistry.getSidebars();

  const [{ changelogHasUpdates, sidebar, widescreen }, uiDispatch] =
    useNsmSlice(nsmUISlice);

  const sideBarComponents = sidebars
    .filter((r) => {
      return r.activitybarIconShow ? r.activitybarIconShow(wsName) : true;
    })
    .map((r) => {
      const active = sidebar === r.name;

      return (
        <Button
          ariaLabel={r.hint}
          key={r.name}
          onPress={() => {
            uiDispatch(nsmUI.toggleSideBar(r.name));
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
          if (wsName) {
            uiDispatch(nsmUI.closeSidebar());
            pageDispatch(
              goToWorkspaceHome({
                wsName,
              }),
            );
          }
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
          uiDispatch(
            nsmUI.showDialog({
              dialogName: CHANGELOG_MODAL_NAME,
            }),
          );
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
