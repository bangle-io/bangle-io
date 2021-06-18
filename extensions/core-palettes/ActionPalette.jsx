import React, {
  useContext,
  useCallback,
  useImperativeHandle,
  useMemo,
} from 'react';
import {
  MagicPaletteItem,
  MagicPaletteItemsContainer,
} from 'magic-palette/index';
import { PaletteInfo, PaletteInfoItem, NullIcon } from 'ui-components';
import { extensionName } from './config';
import { ActionContext } from 'action-context';
import { keybindings } from 'config/index';
import { useRecencyWatcher } from './hooks';
import { ExtensionRegistryContext } from 'extension-registry';

const identifierPrefix = '>';
export const actionPalette = {
  type: extensionName + '/action',
  icon: (
    <span className="pr-2 flex items-center">
      <NullIcon className="h-5 w-5" />
    </span>
  ),
  identifierPrefix,
  placeholder: 'Actions',
  keybinding: keybindings.toggleCommandPalette.key,
  parseRawQuery: (rawQuery) => {
    if (identifierPrefix && rawQuery.startsWith(identifierPrefix)) {
      return rawQuery.slice(1);
    }
    return null;
  },
  ReactComponent: React.forwardRef(ActionPaletteUIComponent),
};

const storageKey = 'ActionPaletteUIComponent/1';

function ActionPaletteUIComponent(
  { query, updatePalette, dismissPalette, paletteItemProps },
  ref,
) {
  const extensionRegistry = useContext(ExtensionRegistryContext);
  const { dispatchAction } = useContext(ActionContext);
  const { injectRecency, updateRecency } = useRecencyWatcher(storageKey);

  const items = useMemo(() => {
    let actions = injectRecency(
      extensionRegistry
        .getRegisteredActions()
        .map((actionDefinition) => {
          return {
            uid: actionDefinition.name,
            title: actionDefinition.title,
            data: actionDefinition,
          };
        })
        .filter((obj) => strMatch(obj.title, query)),
    );

    return actions.slice(0, 50);
  }, [extensionRegistry, injectRecency, query]);

  const onExecuteItem = useCallback(
    (getUid, sourceInfo) => {
      const uid = getUid(items);
      const item = items.find((item) => item.uid === uid);
      if (item) {
        dispatchAction({ name: item.data.name });
        updateRecency(uid);
      }
    },
    [dispatchAction, updateRecency, items],
  );

  // Expose onExecuteItem for the parent to call it
  // If we dont do this clicking or entering will not work
  useImperativeHandle(
    ref,
    () => ({
      onExecuteItem,
    }),
    [onExecuteItem],
  );

  return (
    <>
      <MagicPaletteItemsContainer>
        {items.map((item) => {
          return (
            <MagicPaletteItem
              key={item.uid}
              items={items}
              title={item.title}
              extraInfo={item.extraInfo}
              showDividerAbove={item.showDividerAbove}
              uid={item.uid}
              rightIcons={item.rightIcons}
              rightHoverIcons={item.rightHoverIcons}
              isDisabled={item.disabled}
              {...paletteItemProps}
            />
          );
        })}
      </MagicPaletteItemsContainer>
      <PaletteInfo>
        <PaletteInfoItem>use:</PaletteInfoItem>
        <PaletteInfoItem>
          <kbd className="font-normal">↑↓</kbd> Navigate
        </PaletteInfoItem>
        <PaletteInfoItem>
          <kbd className="font-normal">Enter</kbd> Select a Palette
        </PaletteInfoItem>
      </PaletteInfo>
    </>
  );
}

function strMatch(a, b) {
  b = b.toLocaleLowerCase();
  if (Array.isArray(a)) {
    return a.filter(Boolean).some((str) => strMatch(str, b));
  }

  a = a.toLocaleLowerCase();
  return a.includes(b) || b.includes(a);
}
