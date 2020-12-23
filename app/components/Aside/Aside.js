import './aside.css';
import React from 'react';
import { ActivityBar } from './ActivityBar';
import { FileBrowser } from './FileBrowser';
import { UIContext } from 'bangle-play/app/store/UIContext';

export class Aside extends React.PureComponent {
  render() {
    return (
      <UIContext.Consumer>
        {({ isSidebarOpen, paletteType, updateUIContext }) => (
          <>
            <ActivityBar
              isSidebarOpen={isSidebarOpen}
              updateUIContext={updateUIContext}
              paletteType={paletteType}
            />
            {isSidebarOpen ? (
              <FileBrowser updateUIContext={updateUIContext} />
            ) : null}
          </>
        )}
      </UIContext.Consumer>
    );
  }
}
