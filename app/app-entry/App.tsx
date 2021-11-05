import React from 'react';

import { AppContainer } from './AppContainer';

export default class App extends React.PureComponent {
  state = {
    show: true,
  };
  render() {
    return this.state.show && <AppContainer />;
  }
}
