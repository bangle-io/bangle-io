import React from 'react';
import ReactDOM from 'react-dom';
import { BrowserRouter as Router } from 'react-router-dom';

import App from './app/App';
import { EditorManager } from './app/editor/EditorManager';
import { isTouchDevice } from './app/misc/index';
import { UIManager } from './app/UIManager';

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
