import React from 'react';
import ReactDOM from 'react-dom';

import { MyExtension } from './MyExtension';

ReactDOM.render(
  React.createElement(MyExtension, {}),
  document.getElementById('root'),
);
