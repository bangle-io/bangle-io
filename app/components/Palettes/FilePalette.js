import React, { useCallback, useEffect, useState } from 'react';
import { Palette } from '../../ui/Palette';
import { SideBarRow } from '../Aside/SideBarRow';
import PropTypes from 'prop-types';
import {
  useGetWorkspaceFiles,
  useWorkspacePath,
} from 'bangle-io/app/workspace/workspace-hooks';
import { resolvePath } from 'bangle-io/app/workspace/path-helpers';

const LOG = false;

let log = LOG ? console.log.bind(console, 'play/file-palette') : () => {};

FilePalette.propTypes = {
  counter: PropTypes.number.isRequired,
  query: PropTypes.string.isRequired,
  execute: PropTypes.bool,
  onDismiss: PropTypes.func.isRequired,
};

export function FilePalette({ execute, onDismiss, query, counter }) {
  const { pushWsPath } = useWorkspacePath();

  const [files] = useGetWorkspaceFiles();
  const wsPaths = getItems({ query, files });
  const onExecuteItem = useCallback(
    (activeItemIndex) => {
      activeItemIndex =
        activeItemIndex == null
          ? Palette.getActiveIndex(counter, wsPaths.length)
          : activeItemIndex;

      const activeWsPath = wsPaths[activeItemIndex];
      if (!activeWsPath) {
        return;
      }
      pushWsPath(activeWsPath);
      onDismiss();
    },
    [counter, wsPaths, pushWsPath, onDismiss],
  );

  useEffect(() => {
    // parent signals execution by setting execute to true
    // and expects the child to call dismiss once executed
    if (execute === true) {
      onExecuteItem();
    }
  }, [execute, onExecuteItem]);

  return wsPaths.map((wsPath, i) => (
    <SideBarRow
      key={wsPath}
      isActive={Palette.getActiveIndex(counter, wsPaths.length) === i}
      title={resolvePath(wsPath).filePath}
      onClick={() => onExecuteItem(i)}
    />
  ));
}

function getItems({ query, files }) {
  if (!query) {
    return files;
  }
  return files.filter((file) => {
    const title = file;
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
