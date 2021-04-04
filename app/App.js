import React from 'react';
import { AppContainer } from './AppContainer';

export default class App extends React.PureComponent {
  state = {
    show: true,
  };
  render() {
    window.setState = () => {
      this.setState((state) => ({ show: !state.show }));
    };
    return this.state.show && <AppContainer />;
  }
}
