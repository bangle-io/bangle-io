import {
  blockquote,
  bulletList,
  heading,
  orderedList,
  paragraph,
} from '@bangle.dev/base-components';
import { chainCommands } from '@bangle.dev/pm';

const { insertEmptyParagraphAbove, insertEmptyParagraphBelow } = paragraph;
const { queryIsBulletListActive } = bulletList;
const { queryIsOrderedListActive } = orderedList;
const {
  insertEmptyParaAbove: headingInsertEmptyParaAbove,
  insertEmptyParaBelow: headingInsertEmptyParaBelow,
} = heading;

const {
  insertEmptyParaAbove: blockquoteInsertEmptyParaAbove,
  insertEmptyParaBelow: blockquoteInsertEmptyParaBelow,
} = blockquote;

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
