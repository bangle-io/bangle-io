import './style.css';

import { defaultTheme, Provider } from '@adobe/react-spectrum';
import { Dhancha } from '@bangle.io/ui';
import React from 'react';

export function App() {
  return (
    <Provider theme={defaultTheme}>
      <Dhancha
        widescreen={true}
        activitybar={
          <div
            onClick={() => {
              // empty
            }}
          >
            Activitybar
          </div>
        }
        mainContent={<div>Main content</div>}
        noteSidebar={<div>Note</div>}
        workspaceSidebar={<div>Workspace sidebar</div>}
      />
    </Provider>
  );
}
