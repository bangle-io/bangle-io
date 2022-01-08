import React, { useCallback, useImperativeHandle, useMemo } from 'react';

import { useSerialOperationContext } from '@bangle.io/action-context';
import { CorePalette } from '@bangle.io/constants';
import { useExtensionRegistryContext } from '@bangle.io/extension-registry';
import { TerminalIcon, UniversalPalette } from '@bangle.io/ui-components';

import { ExtensionPaletteType } from './config';
import { useRecencyWatcher } from './hooks';

const identifierPrefix = '>';

const storageKey = 'ActionPaletteUIComponent/1';

const ActionPaletteUIComponent: ExtensionPaletteType['ReactComponent'] =
  React.forwardRef(({ query, onSelect, getActivePaletteItem }, ref) => {
    const extensionRegistry = useExtensionRegistryContext();
    const { dispatchSerialOperation } = useSerialOperationContext();
    const { injectRecency, updateRecency } = useRecencyWatcher(storageKey);

    const items = useMemo(() => {
      let operations = injectRecency(
        extensionRegistry
          .getRegisteredOperations()
          .filter((obj) => !obj.hidden)
          .map((operationDefinition) => {
            return {
              uid: operationDefinition.name,
              title: operationDefinition.title || operationDefinition.name,
              data: operationDefinition,
            };
          })
          .filter((obj) => strMatch(obj.title, query)),
      );

      return operations.slice(0, 50);
    }, [extensionRegistry, injectRecency, query]);

    const onExecuteItem = useCallback(
      (getUid, sourceInfo) => {
        const uid = getUid(items);
        const item = items.find((item) => item.uid === uid);
        if (item) {
          dispatchSerialOperation({ name: item.data.name });
          updateRecency(uid);
        }
      },
      [dispatchSerialOperation, updateRecency, items],
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

    const activeItem = getActivePaletteItem(items);

    return (
      <>
        <UniversalPalette.PaletteItemsContainer>
          {items.map((item) => {
            return (
              <UniversalPalette.PaletteItemUI
                key={item.uid}
                item={item}
                onClick={onSelect}
                isActive={activeItem === item}
              />
            );
          })}
        </UniversalPalette.PaletteItemsContainer>
        <UniversalPalette.PaletteInfo>
          <UniversalPalette.PaletteInfoItem>
            use:
          </UniversalPalette.PaletteInfoItem>
          <UniversalPalette.PaletteInfoItem>
            <kbd className="font-normal">↑↓</kbd> Navigate
          </UniversalPalette.PaletteInfoItem>
          <UniversalPalette.PaletteInfoItem>
            <kbd className="font-normal">Enter</kbd> Execute
          </UniversalPalette.PaletteInfoItem>
        </UniversalPalette.PaletteInfo>
      </>
    );
  });

export const operationPalette: ExtensionPaletteType = {
  type: CorePalette.Operation,
  icon: <TerminalIcon />,
  identifierPrefix,
  placeholder: 'Operations',
  parseRawQuery: (rawQuery) => {
    if (identifierPrefix && rawQuery.startsWith(identifierPrefix)) {
      return rawQuery.slice(1);
    }
    return null;
  },
  ReactComponent: ActionPaletteUIComponent,
};

function strMatch(a, b) {
  b = b.toLocaleLowerCase();
  if (Array.isArray(a)) {
    return a.filter(Boolean).some((str) => strMatch(str, b));
  }

  a = a.toLocaleLowerCase();
  return a.includes(b) || b.includes(a);
}
