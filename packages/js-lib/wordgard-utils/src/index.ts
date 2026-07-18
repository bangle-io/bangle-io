/**
 * The single import chokepoint for the `wordgard` editor system. Nothing else
 * in the repo may import `wordgard/*` directly (mirroring how banger-editor
 * re-exports `prosemirror-*`): wordgard is pre-1.0 with deliberate breaking
 * changes, and funneling every import through this package makes each upgrade
 * a one-package problem and gives us a place to patch over upstream changes.
 *
 * Only the subpath modules that current milestones consume are re-exported;
 * grow this surface as `editor-w` milestones need more (state, editor,
 * command, history, table, phrases).
 */

export { Command, listIsActive, Menu } from 'wordgard/command';
export {
  Attributes,
  ChangeSet,
  Elt,
  Leaf,
  Mark,
  Node,
  Plot,
  Pos,
  parse,
  Schema,
  SchemaError,
  type Shape,
  Slice,
  serialize,
  type Token,
  ValidationError,
} from 'wordgard/doc';
// Editor-side modules, grown for M4-P0 (wordgard-plus bridge): the editor
// class (with its Update/Plugin/updateListener statics), tooltips, state
// primitives, the command/menu model, history depth queries, and the
// built-in schema bundles that carry first-party menu buttons.
export { Tooltip, Wordgard } from 'wordgard/editor';
export { history, redoDepth, undoDepth } from 'wordgard/history';
export {
  basicSchema,
  blockquote,
  bulletList,
  emphasis,
  heading,
  orderedList,
  strong,
} from 'wordgard/schema';
export { GardSelection, GardState, Transaction } from 'wordgard/state';
export {
  Alignment,
  BackgroundColor,
  BlockCell,
  BlockHeaderCell,
  Blockquote,
  BulletList,
  CaptionedFigure,
  Cell,
  Code,
  CodeBlock,
  CodeBlockLanguage,
  Color,
  ColSpan,
  Direction,
  Doc,
  Emphasis,
  Figure,
  HeaderCell,
  Heading,
  HorizontalRule,
  Image,
  ImageAlt,
  ImageSize,
  InlineDoc,
  InlineListItem,
  LineBreak,
  Link,
  ListItem,
  OrderedList,
  Paragraph,
  RowSpan,
  Strikethrough,
  Strong,
  Subscript,
  Superscript,
  Table,
  TableRow,
  Underline,
} from 'wordgard/types';
export {
  Frontmatter,
  frontmatterDocContentOverride,
} from './frontmatter';
export { ListTight } from './list-tight';
export { TaskItem, taskListContentOverrides } from './task-item';
export { ImageTitle, LinkTitle } from './title-marks';
export { WikiLink, WikiLinkLabel } from './wiki-link';
