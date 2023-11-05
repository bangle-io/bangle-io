import './style';

import React from 'react';
import ReactDOM from 'react-dom/client';

import { App } from '@bangle.io/app';
import { assertIsDefined } from '@bangle.io/mini-js-utils';

const rootElement = document.getElementById('root');
assertIsDefined(rootElement, 'root element is not defined');

const root = ReactDOM.createRoot(rootElement);

root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
