import './OptionsBar.css';
import React, { useCallback, useContext } from 'react';
import {
  MoreAltIcon,
  ChevronDoubleRightIcon,
  SecondaryEditorIcon,
  TerminalIcon,
  FileDocumentIcon,
} from '../helper-ui/Icons';
import { useWorkspacePath } from 'workspace/index';
import { UIManagerContext } from 'ui-context/index';
import { cx, useKeybindings, useLocalStorage } from 'utils/index';
import { keybindings } from 'config/index';
import { COMMAND_PALETTE, FILE_PALETTE } from '../Palette/index';
let isDirty = false;

const localStoragePrefix = '0.3438144247845969';

export function OptionsBar() {
  const [expanded, _setExpanded] = useLocalStorage(
    'OptionsBar' + localStoragePrefix,
    false,
  );

  const setExpanded = (...args) => {
    isDirty = true;
    _setExpanded(...args);
  };

  const { paletteType, widescreen, dispatch } = useContext(UIManagerContext);

  const {
    wsPath,
    secondaryWsPath,
    pushWsPath,
    removeSecondaryWsPath,
  } = useWorkspacePath();

  const toggleFilePalette = () => {
    dispatch({
      type: 'UI/CHANGE_PALETTE_TYPE',
      value: {
        type: paletteType === FILE_PALETTE ? null : FILE_PALETTE,
      },
    });
  };

  const toggleCommandPalette = () => {
    dispatch({
      type: 'UI/CHANGE_PALETTE_TYPE',
      value: {
        type: paletteType === COMMAND_PALETTE ? null : COMMAND_PALETTE,
      },
    });
  };

  const toggleSecondaryEditor = useCallback(
    (event) => {
      if (!wsPath) {
        return;
      }
      if (secondaryWsPath) {
        removeSecondaryWsPath();
      } else {
        pushWsPath(wsPath, false, true);
      }
    },
    [secondaryWsPath, wsPath, removeSecondaryWsPath, pushWsPath],
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

  if (!widescreen) {
    return null;
  }

  const expandedComponents = (
    <>
      <OptionsButton
        active={paletteType === COMMAND_PALETTE}
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
      <OptionsButton
        active={paletteType === FILE_PALETTE}
        hint={'File Palette\n' + keybindings.toggleFilePalette.displayValue}
        onClick={() => toggleFilePalette()}
      >
        <FileDocumentIcon
          style={{ transform: 'scale(0.88, 0.88)' }}
          className={cx('cursor-pointer')}
        />
      </OptionsButton>
      {widescreen && (
        <OptionsButton
          hint={
            (secondaryWsPath ? 'Hide split screen' : 'Split screen') +
            `\n${keybindings.toggleSecondaryEditor.displayValue}`
          }
          active={secondaryWsPath}
          onClick={toggleSecondaryEditor}
        >
          <SecondaryEditorIcon
            style={{ transform: 'scale(0.9, 1)' }}
            className="cursor-pointer"
          />
        </OptionsButton>
      )}
      <OptionsButton hint="Hide options bar" onClick={() => setExpanded(false)}>
        <ChevronDoubleRightIcon
          className={cx(
            'cursor-pointer',
            isDirty && 'rotate180AntiClockwiseAnimation',
          )}
        />
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
            <MoreAltIcon className="cursor-pointer" fill="red" />
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
    <button
      type="button"
      aria-label={hint}
      data-bangle-editor-pos={hintPos}
      data-bangle-editor-break={true}
      className={cx(active && 'active', 'focus:outline-none') + ' ' + className}
      onClick={(event) => {
        if (event?.currentTarget) {
          event.currentTarget.blur();
        }
        onClick(event);
      }}
    >
      {children}
    </button>
  );
}
