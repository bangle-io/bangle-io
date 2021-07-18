import {
  PRIMARY_SCROLL_PARENT_ID,
  SECONDARY_SCROLL_PARENT_ID,
} from 'constants';
import React from 'react';
import { useUIManagerContext } from 'ui-context';
import { cx } from 'utils';
import { useWorkspaceContext } from 'workspace-context';
import { OptionsBar } from '../components/OptionsBar';
import { EditorArea } from '../editor/EditorArea';
import { HelpWorkspaceMonitor } from '../watchers/HelpWorkspaceModified';

export function WorkspacePage() {
  const { widescreen } = useUIManagerContext();
  const { primaryWsPath, secondaryWsPath, updateOpenedWsPaths } =
    useWorkspaceContext();

  const secondaryEditor = widescreen && Boolean(secondaryWsPath);
  const showTabs = Boolean(secondaryEditor);

  return (
    <>
      <EditorArea
        id={cx(widescreen && secondaryEditor && PRIMARY_SCROLL_PARENT_ID)}
        className="primary-editor"
        editorId={0}
        showTabs={false}
        wsPath={primaryWsPath}
        onClose={() =>
          updateOpenedWsPaths((openedWsPaths) =>
            openedWsPaths.updatePrimaryWsPath(null),
          )
        }
      />

      {primaryWsPath && <HelpWorkspaceMonitor wsPath={primaryWsPath} />}
      {secondaryWsPath && <HelpWorkspaceMonitor wsPath={secondaryWsPath} />}
      {widescreen && <OptionsBar />}
      {widescreen && secondaryEditor && <div className="grid-gutter" />}
      {widescreen && secondaryEditor && (
        <EditorArea
          id={cx(widescreen && secondaryEditor && SECONDARY_SCROLL_PARENT_ID)}
          className="secondary-editor fadeInAnimation"
          editorId={1}
          showTabs={showTabs}
          wsPath={secondaryWsPath}
          onClose={() =>
            updateOpenedWsPaths((openedWsPaths) =>
              openedWsPaths.updateSecondaryWsPath(null),
            )
          }
        />
      )}
    </>
  );
}
