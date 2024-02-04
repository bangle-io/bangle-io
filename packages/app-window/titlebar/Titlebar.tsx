import {
  Breadcrumbs,
  Flex,
  Item,
  ToggleButton,
  View,
} from '@adobe/react-spectrum';
import { useStore, useTrack } from '@nalanda/react';
import HomeIcon from '@spectrum-icons/workflow/Home';
import MarginLeftIcon from '@spectrum-icons/workflow/MarginLeft';
import MarginRightIcon from '@spectrum-icons/workflow/MarginRight';
import SearchIcon from '@spectrum-icons/workflow/Search';
import React from 'react';

import { PAGE_ROUTE } from '@bangle.io/constants';
import { slicePage } from '@bangle.io/slice-page';
import { sliceUI } from '@bangle.io/slice-ui';
import {
  locationHelpers,
  OpenedWsPaths,
  resolvePath,
  toFSPath,
} from '@bangle.io/ws-path';

export function Titlebar() {
  const { showRightAside, widescreen, showLeftAside, showActivitybar } =
    useTrack(sliceUI);

  const { wsName = 'INVALID', openedWsPaths, location } = useTrack(slicePage);
  const store = useStore();

  return (
    <div className="bg-colorBgLayerMiddle px-2 h-full w-full flex flex-row flex-justify-between flex-items-center border-b-1 border-colorNeutralBorder">
      <View overflow="hidden" flexGrow={2}>
        <BreadcrumbView
          wsName={wsName}
          openedWsPaths={openedWsPaths}
          pathname={location?.pathname}
        />
      </View>
      <Flex direction="row">
        {widescreen && (
          <div>
            <ToggleButton
              isQuiet
              isSelected={showActivitybar}
              onPress={() => {
                store.dispatch(sliceUI.actions.toggleActivitybar(undefined));
              }}
            >
              <SearchIcon size="S" />
            </ToggleButton>
          </div>
        )}
        {widescreen && (
          <div>
            <ToggleButton
              isQuiet
              isSelected={showLeftAside}
              onPress={() => {
                store.dispatch(sliceUI.actions.toggleLeftAside(undefined));
              }}
            >
              <MarginLeftIcon size="S" />
            </ToggleButton>
          </div>
        )}
        {/* {widescreen && (
          <div>
            <ToggleButton
              isQuiet
              isSelected={showRightAside}
              onPress={() => {
                store.dispatch(sliceUI.actions.toggleRightAside(undefined));
              }}
            >
              <MarginRightIcon size="S" />
            </ToggleButton>
          </div>
        )} */}
      </Flex>
    </div>
  );
}

function BreadcrumbView({
  wsName,
  openedWsPaths,
  pathname,
}: {
  wsName: string;
  openedWsPaths: OpenedWsPaths;
  pathname: string | undefined;
}) {
  const store = useStore();

  const pageRoute = locationHelpers.getPageRoute(pathname);

  if (pageRoute === PAGE_ROUTE.workspaceSelect) {
    return (
      <Breadcrumbs size="S">
        <Item key={'welcome'}>Welcome</Item>
      </Breadcrumbs>
    );
  }

  if (pageRoute === PAGE_ROUTE.notFound) {
    return (
      <Breadcrumbs size="S">
        <Item key={'welcome'}>Not Found</Item>
      </Breadcrumbs>
    );
  }

  if (pageRoute === PAGE_ROUTE.unknown) {
    return null;
  }

  if (pageRoute === PAGE_ROUTE.workspaceHome) {
    return (
      <Breadcrumbs size="S">
        <Item key={'welcome'}>{wsName}</Item>
      </Breadcrumbs>
    );
  }

  if (pageRoute === PAGE_ROUTE.workspaceNativeFsAuth) {
    return (
      <Breadcrumbs size="S">
        <Item key={'auth'}>Authorization</Item>
      </Breadcrumbs>
    );
  }

  if (pageRoute === PAGE_ROUTE.editor) {
    const primaryWsPath = openedWsPaths.primaryWsPath;

    if (primaryWsPath === undefined) {
      return (
        <Breadcrumbs size="S">
          <Item key={'ws'}>
            <HomeIcon size="S" />
          </Item>
          <Item key={wsName}>{wsName}</Item>
        </Breadcrumbs>
      );
    }

    const pathParts = toFSPath(primaryWsPath).split('/').filter(Boolean);

    return (
      <Breadcrumbs
        size="S"
        showRoot
        onAction={(key) => {
          if (key === 'ws') {
            store.dispatch(
              slicePage.actions.goTo((location) =>
                locationHelpers.goToWorkspaceHome(location, wsName),
              ),
            );
          }
        }}
      >
        {pathParts.map((part, i): any => {
          if (i === 0) {
            return (
              <Item key={'ws'}>
                <HomeIcon size="S" />
              </Item>
            );
          }
          return <Item key={i}>{part}</Item>;
        })}
      </Breadcrumbs>
    );
  }

  return null;
}
