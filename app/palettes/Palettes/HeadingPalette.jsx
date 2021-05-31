import { EditorManagerContext } from 'editor-manager-context/index';
import React, { useContext, useMemo, useRef } from 'react';
import { HEADING_PALETTE, PaletteTypeBase } from '../paletteTypes';
import { Selection } from '@bangle.dev/core/prosemirror/state';
import {
  NullIcon,
  PaletteInput,
  PaletteItemsContainer,
  SidebarRow,
  usePaletteProps,
} from 'ui-components/index';
import { addBoldToTitle } from '../utils';
import { useKeybindings } from 'utils/index';

export class HeadingPalette extends PaletteTypeBase {
  static type = HEADING_PALETTE;
  static identifierPrefix = '#';
  static description = 'Jump to a heading';
  static PaletteIcon = NullIcon;
  static UIComponent = HeadingPaletteUIComponent;
  static placeholder = 'Type a heading name';
}

const ActivePalette = HeadingPalette;

function HeadingPaletteUIComponent({
  query,
  dismissPalette,
  updateRawInputValue,
  rawInputValue,
}) {
  const { primaryEditor } = useContext(EditorManagerContext);

  const resolvedItems = useMemo(() => {
    if (!primaryEditor || primaryEditor.destroyed) {
      return [];
    }

    const headingNodes = [];
    primaryEditor.view.state.doc.forEach((node, offset, i) => {
      if (node.type.name === 'heading') {
        headingNodes.push({
          offset,
          level: node.attrs.level,
          title: node.textContent,
        });
      }
    });

    return headingNodes
      .filter((r) => strMatch(r.title + ' ' + r.level, query))
      .map((r, i) => {
        return {
          uid: 'heading' + i,
          title: addBoldToTitle(r.title, query),
          onExecute: () => {
            dismissPalette();
            // Using this to wait for editor to get focused
            setTimeout(() => {
              requestAnimationFrame(() => {
                if (!primaryEditor || primaryEditor.destroyed) {
                  return;
                }
                const { dispatch, state } = primaryEditor.view;
                const tr = state.tr;
                dispatch(
                  tr
                    .setSelection(Selection.near(tr.doc.resolve(r.offset)))
                    .scrollIntoView(),
                );
              });
            }, 10);
          },
        };
      });
  }, [query, dismissPalette, primaryEditor]);

  const updateCounterRef = useRef();
  const { getItemProps, inputProps } = usePaletteProps({
    onDismiss: dismissPalette,
    resolvedItems,
    value: rawInputValue,
    updateValue: updateRawInputValue,
    updateCounterRef,
  });

  useKeybindings(() => {
    return {
      [ActivePalette.keybinding]: () => {
        updateCounterRef.current?.((counter) => counter + 1);
      },
    };
  }, []);

  return (
    <>
      <PaletteInput
        placeholder={ActivePalette.placeholder}
        ref={useRef()}
        paletteIcon={
          <span className="pr-2 flex items-center">
            <NullIcon className="h-5 w-5" />
          </span>
        }
        {...inputProps}
      />
      <PaletteItemsContainer>
        {resolvedItems.map((item, i) => {
          return (
            <SidebarRow
              dataId={item.uid}
              className="palette-row"
              key={item.uid}
              title={item.title}
              rightHoverIcon={item.rightHoverIcon}
              rightIcon={
                <kbd className="whitespace-nowrap">{item.keybinding}</kbd>
              }
              {...getItemProps(item, i)}
            />
          );
        })}
      </PaletteItemsContainer>
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
