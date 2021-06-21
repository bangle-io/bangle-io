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
} from 'ui-components/index';
import { useWorkspaceContext } from 'workspace-context';
import { ExtensionRegistryContext } from 'extension-registry';
import { ActionContext } from 'action-context/index';

const localStoragePrefix = '0.3438144247845969';

export function OptionsBar() {
  const extensionRegistry = useContext(ExtensionRegistryContext);
  const { dispatchAction } = useContext(ActionContext);
  const [expanded, setExpanded] = useLocalStorage(
    'OptionsBar' + localStoragePrefix,
    true,
  );
  const { widescreen } = useContext(UIManagerContext);
  const { pushWsPath, primaryWsPath, secondaryWsPath, updateOpenedWsPaths } =
    useWorkspaceContext();

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
  const injectedOptions = extensionRegistry
    .getOptionsBarEntries()
    .map((r, i) => {
      return (
        <OptionsButton
          key={i}
          hint={r.hint}
          onClick={() => {
            dispatchAction({ name: r.action });
          }}
        >
          {r.icon}
        </OptionsButton>
      );
    });
  const expandedComponents = (
    <>
      {widescreen && injectedOptions}
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
