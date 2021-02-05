import React, { useCallback, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import {
  hasPermission,
  NativeFilePermissionError,
  requestPermission,
} from '../workspace2/nativefs-helpers';
import { getWorkspaceInfo } from '../workspace2/workspace-helpers';
import {} from '../workspace2/workspace-hooks';

const NeedsPermission = ({ onPermissionGranted, onPermissionRejected }) => {
  const { wsName } = useParams();

  const open = useCallback(async () => {
    const workspace = await getWorkspaceInfo(wsName);
    if (!workspace) {
      throw new Error(' workspace not found');
    }

    if (workspace.type !== 'nativefs') {
      onPermissionGranted();
      return;
    }

    if (await requestPermission(workspace.metadata.rootDirHandle)) {
      onPermissionGranted();
    } else {
      alert('You will need to grant permission to edit ' + wsName);
      onPermissionRejected();
      return;
    }
  }, [onPermissionGranted, wsName]);

  return (
    <div className="flex justify-center flex-row h-full" onClick={open}>
      Press Enter twice or click anywhere to resume working on {wsName}
    </div>
  );
};

const HarmLess = ({ onPermissionGranted, onPermissionRejected }) => {
  const { wsName } = useParams();
  useEffect(() => {
    getWorkspaceInfo(wsName).then((workspace) => {
      console.log('here', workspace);
      if (workspace.type !== 'nativefs') {
        onPermissionGranted();
        return;
      }
      hasPermission(workspace.metadata.rootDirHandle).then((permission) => {
        if (permission) {
          onPermissionGranted();
        } else {
          onPermissionRejected();
        }
      });
    });
  }, [wsName, onPermissionGranted, onPermissionRejected]);

  return null;
};

export class WorkspacePermissionErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  async componentDidMount() {}

  static getDerivedStateFromError(error) {
    if (error instanceof NativeFilePermissionError) {
      return { hasError: true };
    }
    // Update state so the next render will show the fallback UI.
    return { hasError: false };
  }

  componentDidCatch(error, errorInfo) {
    // You can also log the error to an error reporting service
    console.log('CAUGHT ERROR');
    console.log(error);
  }

  onPermissionGranted = () => {
    this.setState({ hasError: false });
  };
  onPermissionRejected = () => {
    this.setState({ hasError: true });
  };

  render() {
    if (this.state.hasError) {
      // if (active) {
      return (
        <NeedsPermission
          onPermissionGranted={this.onPermissionGranted}
          onPermissionRejected={this.onPermissionRejected}
        />
      );
    }

    return (
      <>
        <HarmLess
          onPermissionGranted={this.onPermissionGranted}
          onPermissionRejected={this.onPermissionRejected}
        />
        {this.props.children}
      </>
    );
  }
}

export function WorkspacePermissionModal({ children }) {
  return (
    <WorkspacePermissionErrorBoundary>
      {children}
    </WorkspacePermissionErrorBoundary>
  );
  // return children;
}
