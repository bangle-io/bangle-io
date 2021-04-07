import 'style/index.js';
import { UIManager } from 'ui-context/index';
import React from 'react';
import ReactDOM from 'react-dom';
import { BrowserRouter as Router } from 'react-router-dom';

import App from './App';
import { EditorManager } from './editor/EditorManager';

const root = document.getElementById('root');

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
