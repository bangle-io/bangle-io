import React, { useContext, useMemo } from 'react';
import { UIManagerContext } from 'ui-context/index';

import { CollapsibleSideBarRow, SideBarRow } from './SideBarRow';
import {
  ChevronDownIcon,
  ChevronRightIcon,
  CloseIcon,
} from '../../helper-ui/Icons';
import {
  useDeleteFile,
  useGetWorkspaceFiles,
  useWorkspacePath,
} from 'app/workspace/workspace-hooks';
import { resolvePath } from 'app/workspace/path-helpers';

FileBrowser.propTypes = {};

export function FileBrowser() {
  const [files] = useGetWorkspaceFiles();
  const deleteByWsPath = useDeleteFile();
  const { dispatch, widescreen } = useContext(UIManagerContext);
  const { wsName, wsPath: activeWSPath, pushWsPath } = useWorkspacePath();

  const fileTree = useMemo(
    () =>
      flatPathsToTree(
        files.map((f) => {
          const { filePath } = resolvePath(f);
          return filePath;
        }),
      ),
    [files],
  );

  return (
    <CollapsibleSideBarRow
      title={wsName}
      leftIcon={<ChevronDownIcon style={{ width: 16, height: 16 }} />}
      activeLeftIcon={<ChevronRightIcon style={{ width: 16, height: 16 }} />}
    >
      {fileTree.map((child) => (
        <RenderPathTree
          fileTree={child}
          widescreen={widescreen}
          key={child.name}
          wsName={wsName}
          deleteByWsPath={deleteByWsPath}
          pushWsPath={pushWsPath}
          activeWSPath={activeWSPath}
          dispatch={dispatch}
          depth={1}
        />
      ))}
    </CollapsibleSideBarRow>
  );
}

function RenderPathTree({
  widescreen,
  fileTree,
  wsName,
  deleteByWsPath,
  pushWsPath,
  activeWSPath,
  dispatch,
  depth,
}) {
  const { name, children, path } = fileTree;

  const closeSidebar = () => {
    dispatch({
      type: 'UI/TOGGLE_SIDEBAR',
      value: { type: null },
    });
  };
  if (children) {
    return (
      <CollapsibleSideBarRow
        initialCollapse={true}
        title={name}
        leftIcon={
          <ChevronDownIcon
            style={{
              height: 16,
              width: 16,
            }}
          />
        }
        activeLeftIcon={
          <ChevronRightIcon
            style={{
              height: 16,
              width: 16,
            }}
          />
        }
        depth={depth}
        basePadding={16}
      >
        {children.map((child) => (
          <RenderPathTree
            key={child.name}
            fileTree={child}
            wsName={wsName}
            deleteByWsPath={deleteByWsPath}
            pushWsPath={pushWsPath}
            activeWSPath={activeWSPath}
            dispatch={dispatch}
            depth={depth + 1}
            basePadding={16}
          />
        ))}
      </CollapsibleSideBarRow>
    );
  }
  // for the files
  if (path) {
    const wsPath = wsName + ':' + path;
    return (
      <SideBarRow
        basePadding={16}
        depth={depth}
        key={wsPath}
        onClick={(event) => {
          if (event.metaKey) {
            pushWsPath(wsPath, true);
          } else if (event.shiftKey) {
            pushWsPath(wsPath, false, true);
          } else {
            pushWsPath(wsPath);
          }
          if (!widescreen) {
            closeSidebar();
          }
        }}
        title={name}
        isActive={activeWSPath === wsPath}
        leftIcon={
          <span
            style={{
              height: 16,
              width: 16,
            }}
          ></span>
        }
        rightHoverIcon={
          <CloseIcon
            style={{
              height: 16,
              width: 16,
            }}
            onClick={async (e) => {
              e.stopPropagation();
              deleteByWsPath(wsPath);
              closeSidebar();
            }}
          />
        }
      />
    );
  }
}

/**
 *
 * @returns An array of deeply nested objects
 *          {name: string, ?children: Array<self>, ?path: string}
 *          for terminals `children` field will be undefined and the
 *          object will have `path` which will be the absolute path of the file
 */
export function flatPathsToTree(files) {
  let mainChain = [];

  for (const f of files) {
    const path = f.split('/');
    let chain = mainChain;
    let counter = 0;
    for (const part of path) {
      counter++;
      let match = chain.find(({ name }) => name === part);

      if (!match) {
        match = { name: part, children: [] };
        if (counter === path.length) {
          match.path = f;
          delete match.children;
        }
        chain.push(match);
      }

      chain = match.children;
    }
  }

  return mainChain;
}
