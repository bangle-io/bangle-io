import React from 'react';
import { AppContainer } from './AppContainer';
import { WorkspaceContextProvider } from './workspace/WorkspaceContext';

export default class App extends React.PureComponent {
  state = {
    show: true,
  };
  render() {
    window.setState = () => {
      this.setState((state) => ({ show: !state.show }));
    };
    return (
      <WorkspaceContextProvider>
        {this.state.show && <AppContainer />}
      </WorkspaceContextProvider>
    );
  }
}
