import './style.css';

import { Button, defaultTheme, Provider } from '@adobe/react-spectrum';
import React from 'react';

export function Main() {
  return (
    <Provider theme={defaultTheme}>
      <Button variant="accent" onPress={() => alert('Hey there!')}>
        Hello React Spectrum!
      </Button>
      <div className="capitalize truncate text-lg bg-colorCautionSolid">
        hello world
      </div>
    </Provider>
  );
}
