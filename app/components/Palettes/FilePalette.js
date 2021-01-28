import React, { useCallback, useEffect, useState } from 'react';
import { Palette } from '../../ui/Palette';
import { SideBarRow } from '../Aside/SideBarRow';
import PropTypes from 'prop-types';
import {
  useGetWorkspaceFiles,
  useWorkspaceDetails,
} from 'bangle-io/app/workspace2/workspace-hooks';

const LOG = false;

let log = LOG ? console.log.bind(console, 'play/file-palette') : () => {};

FilePalette.propTypes = {
  counter: PropTypes.number.isRequired,
  query: PropTypes.string.isRequired,
  execute: PropTypes.bool,
  onDismiss: PropTypes.func.isRequired,
};

export function FilePalette({ execute, onDismiss, query, counter }) {
  const { wsName, pushWsPath } = useWorkspaceDetails();

  const [files] = useGetWorkspaceFiles();
  const items = getItems({ query, files });

  const onExecuteItem = useCallback(
    (activeItemIndex) => {
      activeItemIndex =
        activeItemIndex == null
          ? Palette.getActiveIndex(counter, items.length)
          : activeItemIndex;

      const activeItem = items[activeItemIndex];
      // TODO i found that it can undefined, why/
      if (!activeItem) {
        return;
      }
      pushWsPath(wsName + ':' + activeItem.docName);
      onDismiss();
    },
    [counter, items, pushWsPath, onDismiss, wsName],
  );

  useEffect(() => {
    // parent signals execution by setting execute to true
    // and expects the child to call dismiss once executed
    if (execute === true) {
      onExecuteItem();
    }
  }, [execute, onExecuteItem]);

  return items.map((file, i) => (
    <SideBarRow
      key={file.docName}
      isActive={Palette.getActiveIndex(counter, items.length) === i}
      title={file.title}
      onClick={() => onExecuteItem(i)}
    />
  ));
}

function getItems({ query, files }) {
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
