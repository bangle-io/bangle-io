import React, { useRef } from 'react';

import {
  NullIcon,
  PaletteInfo,
  PaletteInfoItem,
  PaletteInput,
  PaletteItemsContainer,
  SidebarRow,
  usePaletteProps,
} from 'ui-components';
import { PaletteTypeBase, QUESTION_PALETTE } from '../paletteTypes';
import { FilePalette } from './FilePalette';
import { CommandPalette } from './CommandPalette';
import { WorkspacePalette } from './WorkspacePalette';
import { HeadingPalette } from './HeadingPalette';

export class QuestionPalette extends PaletteTypeBase {
  static type = QUESTION_PALETTE;
  static identifierPrefix = '?';
  static description = 'Show available palettes';
  static PaletteIcon = NullIcon;
  static UIComponent = QuestionPaletteUIComponent;
  static placeholder = null;
  static keybinding = null;
}

const ActivePalette = QuestionPalette;

function QuestionPaletteUIComponent({
  dismissPalette,
  updateRawInputValue,
  rawInputValue,

  updatePalette,
}) {
  const resolvedItems = [
    {
      uid: 'file-question-palette',
      title: '…' + FilePalette.description,
      onExecute: () => {
        updatePalette({ type: FilePalette.type });
        return false;
      },
    },
    {
      uid: 'command-question-palette',
      title: CommandPalette.identifierPrefix + ' ' + CommandPalette.description,
      onExecute: () => {
        updatePalette({ type: CommandPalette.type });
        return false;
      },
    },
    {
      uid: 'switch-workspace-question-palette',
      title:
        WorkspacePalette.identifierPrefix + ' ' + WorkspacePalette.description,
      onExecute: () => {
        updatePalette({ type: WorkspacePalette.type });
        return false;
      },
    },
    {
      uid: 'heading-question-palette',
      title: HeadingPalette.identifierPrefix + ' ' + HeadingPalette.description,
      onExecute: () => {
        updatePalette({ type: HeadingPalette.type });
        return false;
      },
    },
  ];

  const { getItemProps, inputProps } = usePaletteProps({
    onDismiss: dismissPalette,
    resolvedItems,
    value: rawInputValue,
    updateValue: updateRawInputValue,
  });

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
              disabled={item.disabled}
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

      <PaletteInfo>
        <PaletteInfoItem>use:</PaletteInfoItem>
        <PaletteInfoItem>
          <kbd className="font-normal">↑↓</kbd> Navigate
        </PaletteInfoItem>
        <PaletteInfoItem>
          <kbd className="font-normal">Enter</kbd> Switch palette type
        </PaletteInfoItem>
      </PaletteInfo>
    </>
  );
}
