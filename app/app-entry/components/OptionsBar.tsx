import './OptionsBar.css';
import { useActionContext } from 'action-context';
import { keybindings, keyDisplayValue } from 'config';
import { useExtensionRegistryContext } from 'extension-registry';
import React, { useCallback } from 'react';
import {
  ButtonIcon,
  ChevronDoubleRightIcon,
  MoreAltIcon,
  SecondaryEditorIcon,
} from 'ui-components';
import { useUIManagerContext } from 'ui-context';
import { cx, useKeybindings, useLocalStorage } from 'utils';
import { useWorkspaceContext } from 'workspace-context';

const localStoragePrefix = '0.3438144247845969';

export function OptionsBar() {
  const extensionRegistry = useExtensionRegistryContext();
  const { dispatchAction } = useActionContext();
  const [expanded, setExpanded] = useLocalStorage(
    'OptionsBar' + localStoragePrefix,
    true,
  );
  const { widescreen } = useUIManagerContext();
  const { pushWsPath, primaryWsPath, secondaryWsPath, updateOpenedWsPaths } =
    useWorkspaceContext();

  const toggleSecondaryEditor = useCallback(() => {
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
  }, [secondaryWsPath, primaryWsPath, updateOpenedWsPaths, pushWsPath]);

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
      const keybinding = extensionRegistry.getRegisteredAction(
        r.action,
      )?.keybinding;

      let hint = r.hint;

      if (keybinding) {
        hint += '\n' + keyDisplayValue(keybinding);
      }

      return (
        <OptionsButton
          key={i}
          hint={hint}
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
}: {
  className?: string;
  hint?: string;
  hintPos?: string;
  children: any;
  onClick: () => void;
  active?: boolean;
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
        onClick();
      }}
    >
      {children}
    </ButtonIcon>
  );
}
