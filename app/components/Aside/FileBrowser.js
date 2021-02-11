import './aside.css';
import React, { useCallback, useContext, useMemo } from 'react';
import { SideBar } from './SideBar';
import { CollapsibleSideBarRow, SideBarRow } from './SideBarRow';
import { BaseButton } from '../Button';
import 'css.gg/icons/css/chevron-down.css';
import { ChevronDown, ChevronRight } from '../../ui/Icons/index';
import {
  useCreateMdFile,
  useDeleteFile,
  useGetWorkspaceFiles,
  useWorkspacePath,
} from 'bangle-io/app/workspace/workspace-hooks';
import { resolvePath } from 'bangle-io/app/workspace/path-helpers';
import { UIManagerContext } from 'bangle-io/app/ui/UIManager';

FileBrowser.propTypes = {};

export function FileBrowser() {
  const [files] = useGetWorkspaceFiles();
  const createNewMdFile = useCreateMdFile();
  const deleteByDocName = useDeleteFile();
  const { dispatch } = useContext(UIManagerContext);
  const { wsName, wsPath: activeWSPath, pushWsPath } = useWorkspacePath();

  const toggleTheme = () => {
    dispatch({
      type: 'UI/TOGGLE_THEME',
    });
  };

  const openNew = useCallback(() => {
    createNewMdFile();
    dispatch({
      type: 'UI/TOGGLE_SIDEBAR',
    });
  }, [dispatch, createNewMdFile]);

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
    <SideBar>
      <CollapsibleSideBarRow
        title={wsName}
        isSticky={true}
        leftIcon={<ChevronDown style={{ width: 16, height: 16 }} />}
        activeLeftIcon={<ChevronRight style={{ width: 16, height: 16 }} />}
      >
        {fileTree.map((child) => (
          <RenderPathTree
            fileTree={child}
            key={child.name}
            wsName={wsName}
            deleteByDocName={deleteByDocName}
            pushWsPath={pushWsPath}
            activeWSPath={activeWSPath}
            dispatch={dispatch}
            depth={1}
          />
        ))}
      </CollapsibleSideBarRow>
    </SideBar>
  );
}

function RenderPathTree({
  fileTree,
  wsName,
  deleteByDocName,
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
        leftIcon={<ChevronDown style={{ width: 16, height: 16 }} />}
        activeLeftIcon={<ChevronRight style={{ width: 16, height: 16 }} />}
        depth={depth}
        basePadding={16}
      >
        {children.map((child) => (
          <RenderPathTree
            key={child.name}
            fileTree={child}
            wsName={wsName}
            deleteByDocName={deleteByDocName}
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
        leftIcon={<span style={{ width: 16, height: 16 }}> </span>}
        rightIcon={[
          <BaseButton
            key="delete"
            className="text-gray-600 hover:text-gray-900"
            faType="fas fa-times-circle "
            onClick={async (e) => {
              e.stopPropagation();
              deleteByDocName(wsPath);
              dispatch({
                type: 'UI/TOGGLE_SIDEBAR',
              });
            }}
          />,
        ]}
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
