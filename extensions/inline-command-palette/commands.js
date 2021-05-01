import { chainCommands } from '@bangle.dev/core/prosemirror/commands';
import {
  insertEmptyParagraphAbove,
  insertEmptyParagraphBelow,
} from '@bangle.dev/core/components/paragraph';
import { queryIsBulletListActive } from '@bangle.dev/core/components/bullet-list';
import { queryIsOrderedListActive } from '@bangle.dev/core/components/ordered-list';
import { queryIsSuggestTooltipActive } from '@bangle.dev/tooltip/suggest-tooltip';

import {
  insertEmptyParaAbove as headingInsertEmptyParaAbove,
  insertEmptyParaBelow as headingInsertEmptyParaBelow,
} from '@bangle.dev/core/components/heading';

import {
  insertEmptyParaAbove as blockquoteInsertEmptyParaAbove,
  insertEmptyParaBelow as blockquoteInsertEmptyParaBelow,
} from '@bangle.dev/core/components/blockquote';

export function chainedInsertParagraphAbove() {
  return chainCommands(
    insertEmptyParagraphAbove(),
    headingInsertEmptyParaAbove(),
    blockquoteInsertEmptyParaAbove(),
  );
}

export function chainedInsertParagraphBelow() {
  return chainCommands(
    insertEmptyParagraphBelow(),
    headingInsertEmptyParaBelow(),
    blockquoteInsertEmptyParaBelow(),
  );
}

export function isList() {
  return chainCommands(queryIsOrderedListActive(), queryIsBulletListActive());
}
