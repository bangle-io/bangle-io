import 'style/index.js';
import { UIManager } from 'ui-context/index';
import React from 'react';
import ReactDOM from 'react-dom';
import { BrowserRouter as Router } from 'react-router-dom';

import App from './App';
import { EditorManager } from './editor/EditorManager';
import { isTouchDevice } from './misc/index';

const root = document.getElementById('root');

if (isTouchDevice) {
  root.classList.add('is-touch');
}

ReactDOM.render(
  <Router>
    <EditorManager>
      <UIManager>
        <App />
      </UIManager>
    </EditorManager>
  </Router>,
  root,
);
