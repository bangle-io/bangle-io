import { ToggleButton } from '@adobe/react-spectrum';
import { useStore, useTrack } from '@nalanda/react';
import MarginRightIcon from '@spectrum-icons/workflow/MarginRight';
import React from 'react';

import { sliceUI } from '@bangle.io/slice-ui';

export function Activitybar() {
  const { widescreen } = useTrack(sliceUI);
  const store = useStore();

  return (
    <div
      style={{
        backgroundColor: 'green',
        height: '100%',
      }}
    >
      A
    </div>
  );
}
