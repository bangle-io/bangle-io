// import './FilePalette.css';
import React from 'react';
import { UIContext } from '../../store/UIContext';
import { Palette } from '../../ui/Palette';
import { SideBarRow } from '../Aside/SideBarRow';
import {
  workspaceActions,
  WorkspaceContext,
} from '../../workspace/WorkspaceContext';
import PropTypes from 'prop-types';

const LOG = false;

let log = LOG ? console.log.bind(console, 'play/file-palette') : () => {};

export function FilePalette(props) {
  return (
    <WorkspaceContext.Consumer>
      {(workspaceContext) => (
        <FilePaletteContainer workspaceContext={workspaceContext} {...props} />
      )}
    </WorkspaceContext.Consumer>
  );
}

FilePalette.propTypes = {};

class FilePaletteContainer extends React.PureComponent {
  static contextType = UIContext;

  static propTypes = {
    workspaceContext: PropTypes.object.isRequired,
    counter: PropTypes.number.isRequired,
    query: PropTypes.string.isRequired,
    execute: PropTypes.bool,
    onDismiss: PropTypes.func.isRequired,
  };

  componentDidUpdate(prevProps) {
    const { execute } = this.props;

    // parent signals execution by setting execute to true
    // and expects the child to call dismiss once executed
    if (execute === true && prevProps.execute !== execute) {
      this.onExecuteItem();
    }
  }

  onExecuteItem = (activeItemIndex) => {
    const { query, counter } = this.props;
    const items = getItems({
      query,
      workspace: this.props.workspaceContext.workspace,
    });

    activeItemIndex =
      activeItemIndex == null
        ? Palette.getActiveIndex(counter, items.length)
        : activeItemIndex;

    const activeItem = items[activeItemIndex];
    // TODO i found that it can undefined, why/
    if (!activeItem) {
      return;
    }
    this.props.workspaceContext.updateWorkspaceContext(
      workspaceActions.openWorkspaceFile(activeItem.docName),
    );
    this.props.onDismiss();
  };

  render() {
    const { query, counter } = this.props;
    const items = getItems({
      query,
      workspace: this.props.workspaceContext.workspace,
    });

    return items.map((file, i) => (
      <SideBarRow
        key={file.docName}
        isActive={Palette.getActiveIndex(counter, items.length) === i}
        title={file.title}
        onClick={() => this.onExecuteItem(i)}
      />
    ));
  }
}

function getItems({ query, workspace }) {
  /**
   * @type {WorkspaceFile[]}
   */
  const files = workspace ? workspace.files : [];

  if (!query) {
    return files;
  }

  return files.filter((file) => {
    const title = file.title;
    return strMatch(title, query);
  });
}

function strMatch(a, b) {
  b = b.toLocaleLowerCase();
  if (Array.isArray(a)) {
    return a.filter(Boolean).some((str) => strMatch(str, b));
  }

  a = a.toLocaleLowerCase();
  return a.includes(b) || b.includes(a);
}
