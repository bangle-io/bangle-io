import {
  Breadcrumbs,
  Flex,
  Item,
  ToggleButton,
  View,
} from '@adobe/react-spectrum';
import { useStore, useTrack } from '@nalanda/react';
import MarginLeftIcon from '@spectrum-icons/workflow/MarginLeft';
import MarginRightIcon from '@spectrum-icons/workflow/MarginRight';
import SearchIcon from '@spectrum-icons/workflow/Search';
import React, { JSX } from 'react';

import { slicePage } from '@bangle.io/slice-page';
import { sliceUI } from '@bangle.io/slice-ui';
import { resolvePath } from '@bangle.io/ws-path';

export function Titlebar() {
  const { showRightAside, widescreen, showLeftAside, showActivitybar } =
    useTrack(sliceUI);

  const { wsName = 'INVALID', location } = useTrack(slicePage);
  const store = useStore();

  return (
    <div className="bg-colorBgLayerMiddle px-2 h-full w-full flex flex-row flex-justify-between flex-items-center border-b-1 border-colorNeutralBorder">
      <View overflow="hidden" flexGrow={2}>
        <BreadcrumbView wsName={wsName} pathname={location?.pathname ?? ''} />
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
        {widescreen && (
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
        )}
      </Flex>
    </div>
  );
}

function BreadcrumbView({
  wsName,
  pathname,
}: {
  wsName: string;
  pathname: string;
}) {
  const pathParts = pathname.split('/').filter((x) => x);

  return (
    <Breadcrumbs size="S" showRoot>
      {pathParts.map((part, i): any => (
        <Item key={i}>{part}</Item>
      ))}
    </Breadcrumbs>
  );
}
