import '@unocss/reset/tailwind-compat.css';
// eslint-disable-next-line
import 'virtual:uno.css';

import { App } from '@bangle.io/app';
import { assertIsDefined } from '@bangle.io/mini-js-utils';
import React from 'react';
import ReactDOM from 'react-dom/client';

const rootElement = document.getElementById('root');
assertIsDefined(rootElement, 'root element is not defined');

const root = ReactDOM.createRoot(rootElement);

root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
