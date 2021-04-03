import React, { useContext, useMemo } from 'react';
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
} from 'bangle-io/app/workspace/workspace-hooks';
import { resolvePath } from 'bangle-io/app/workspace/path-helpers';
import { UIManagerContext } from 'bangle-io/app/UIManager';

FileBrowser.propTypes = {};

export function FileBrowser() {
  const [files] = useGetWorkspaceFiles();
  const deleteByWsPath = useDeleteFile();
  const { dispatch } = useContext(UIManagerContext);
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
  fileTree,
  wsName,
  deleteByWsPath,
  pushWsPath,
  activeWSPath,
  dispatch,
  depth,
}) {
  const { name, children, path } = fileTree;

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
        onClick={() => {
          pushWsPath(wsPath);
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
              dispatch({
                type: 'UI/TOGGLE_SIDEBAR',
                value: { type: null },
              });
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
