import { ToggleButton } from '@adobe/react-spectrum';
import { useStore, useTrack } from '@nalanda/react';
import MarginRightIcon from '@spectrum-icons/workflow/MarginRight';
import React from 'react';

import { sliceUI } from '@bangle.io/slice-ui';

export function LeftAside() {
  const { widescreen } = useTrack(sliceUI);
  const store = useStore();

  return (
    <div className="bg-colorBgLayerFloat px-2 h-full w-full flex flex-row flex-justify-between flex-items-center">
      left
    </div>
  );
}
