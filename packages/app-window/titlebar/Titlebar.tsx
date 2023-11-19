import { ToggleButton } from '@adobe/react-spectrum';
import { useStore, useTrack } from '@nalanda/react';
import MarginLeftIcon from '@spectrum-icons/workflow/MarginLeft';
import MarginRightIcon from '@spectrum-icons/workflow/MarginRight';
import SearchIcon from '@spectrum-icons/workflow/Search';
import React from 'react';

import { sliceUI } from '@bangle.io/slice-ui';

export function Titlebar() {
  const { showRightAside, widescreen, showLeftAside } = useTrack(sliceUI);
  const store = useStore();

  return (
    <div className="bg-colorBgLayerFloat px-2 h-full w-full flex flex-row flex-justify-between flex-items-center">
      <div>I am titlebar</div>
      <div className="flex gap-1">
        {widescreen && (
          <div>
            <ToggleButton
              isQuiet
              isSelected={showLeftAside}
              onPress={() => {
                store.dispatch(sliceUI.actions.updateLeftAside(undefined));
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
                store.dispatch(sliceUI.actions.updateLeftAside(undefined));
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
                store.dispatch(sliceUI.actions.updateShowRightAside(undefined));
              }}
            >
              <MarginRightIcon size="S" />
            </ToggleButton>
          </div>
        )}
      </div>
    </div>
  );
}
