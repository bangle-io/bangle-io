import React from 'react';

import { NullIcon, PaletteUI } from 'ui-components';
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

function QuestionPaletteUIComponent({ updatePalette, paletteProps }) {
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

  return <PaletteUI items={resolvedItems} {...paletteProps} />;
}
