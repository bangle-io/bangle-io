import React from 'react';
import ReactDOM from 'react-dom';
import App from './app/App';
import { isTouchDevice } from './app/misc/index';

const root = document.getElementById('root');

if (isTouchDevice) {
  root.classList.add('is-touch');
}

ReactDOM.render(<App />, root);
