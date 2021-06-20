import './OptionsBar.css';
import React, { useCallback, useContext } from 'react';
import { UIManagerContext } from 'ui-context/index';
import { cx, useKeybindings, useLocalStorage } from 'utils/index';
import { keybindings } from 'config/index';
import {
  ButtonIcon,
  MoreAltIcon,
  ChevronDoubleRightIcon,
  SecondaryEditorIcon,
  TerminalIcon,
  FileDocumentIcon,
  AlbumIcon,
} from 'ui-components/index';
import { useWorkspaceContext } from 'workspace-context';

const localStoragePrefix = '0.3438144247845969';

export function OptionsBar() {
  const [expanded, _setExpanded] = useLocalStorage(
    'OptionsBar' + localStoragePrefix,
    true,
  );

  const setExpanded = (...args) => {
    _setExpanded(...args);
  };

  const { paletteType, widescreen, dispatch } = useContext(UIManagerContext);

  const { pushWsPath, primaryWsPath, secondaryWsPath, updateOpenedWsPaths } =
    useWorkspaceContext();

  const toggleFilePalette = () => {
    // dispatch({
    //   type: 'UI/UPDATE_PALETTE',
    //   value: {
    //     type: paletteType === FILE_PALETTE ? null : FILE_PALETTE,
    //   },
    // });
  };

  const toggleCommandPalette = () => {
    // dispatch({
    //   type: 'UI/UPDATE_PALETTE',
    //   value: {
    //     type: paletteType === COMMAND_PALETTE ? null : COMMAND_PALETTE,
    //   },
    // });
  };
  const toggleWorkspacePalette = () => {
    // dispatch({
    //   type: 'UI/UPDATE_PALETTE',
    //   value: {
    //     type: paletteType === WORKSPACE_PALETTE ? null : WORKSPACE_PALETTE,
    //   },
    // });
  };

  const toggleSecondaryEditor = useCallback(
    (event) => {
      if (!primaryWsPath) {
        return;
      }
      if (secondaryWsPath) {
        updateOpenedWsPaths((openedWsPath) =>
          openedWsPath.updateSecondaryWsPath(null),
        );
      } else {
        pushWsPath(primaryWsPath, false, true);
      }
    },
    [secondaryWsPath, primaryWsPath, updateOpenedWsPaths, pushWsPath],
  );

  useKeybindings(() => {
    return {
      [keybindings.toggleSecondaryEditor.key]: () => {
        if (widescreen) {
          toggleSecondaryEditor();
          return true;
        }
        return false;
      },
    };
  }, [widescreen, toggleSecondaryEditor]);

  const expandedComponents = (
    <>
      <OptionsButton
        // active={
        //   // paletteType === COMMAND_PALETTE
        // }
        hint={
          'Command Palette\n' + keybindings.toggleCommandPalette.displayValue
        }
        onClick={() => toggleCommandPalette()}
      >
        <TerminalIcon
          style={{ transform: 'scale(0.83, 0.83)' }}
          className={cx('cursor-pointer')}
        />
      </OptionsButton>
      {widescreen && (
        <OptionsButton
          hint={
            'Workspace Palette\n' +
            keybindings.toggleWorkspacePalette.displayValue
          }
          // active={paletteType === WORKSPACE_PALETTE}
          onClick={() => toggleWorkspacePalette()}
        >
          <AlbumIcon style={{ transform: 'scale(0.9, 0.9)' }} />
        </OptionsButton>
      )}
      <OptionsButton
        // active={paletteType === FILE_PALETTE}
        hint={'File Palette\n' + keybindings.toggleFilePalette.displayValue}
        onClick={toggleFilePalette}
      >
        <FileDocumentIcon style={{ transform: 'scale(0.88, 0.88)' }} />
      </OptionsButton>
      {widescreen && (
        <OptionsButton
          hint={
            (secondaryWsPath ? 'Hide split screen' : 'Split screen') +
            `\n${keybindings.toggleSecondaryEditor.displayValue}`
          }
          active={Boolean(secondaryWsPath)}
          onClick={toggleSecondaryEditor}
        >
          <SecondaryEditorIcon style={{ transform: 'scale(0.9, 1)' }} />
        </OptionsButton>
      )}

      <OptionsButton hint="Hide options bar" onClick={() => setExpanded(false)}>
        <ChevronDoubleRightIcon />
      </OptionsButton>
    </>
  );
  return (
    <div className="options-bar-area">
      <div className={cx('options-bar-content', expanded && 'fadeInAnimation')}>
        {expanded ? (
          expandedComponents
        ) : (
          <OptionsButton
            hint="Show options bar"
            onClick={() => setExpanded(true)}
          >
            <MoreAltIcon className="cursor-pointer" />
          </OptionsButton>
        )}
      </div>
    </div>
  );
}

function OptionsButton({
  className = '',
  hint,
  hintPos = 'bottom',
  children,
  onClick,
  active,
}) {
  return (
    <ButtonIcon
      hint={hint}
      hintPos={hintPos}
      active={active}
      className={className}
      onClick={(event) => {
        if (event?.currentTarget) {
          event.currentTarget.blur();
        }
        onClick(event);
      }}
    >
      {children}
    </ButtonIcon>
  );
}
