import {
  createBaseMarkdownTokenizer,
  wikiLinkTokenizer,
} from '@bangle.io/markdown-syntax';
import {
  Blockquote,
  BulletList,
  Code,
  CodeBlock,
  CodeBlockLanguage,
  Doc,
  Emphasis,
  Heading,
  HorizontalRule,
  Image,
  ImageAlt,
  ImageTitle,
  LineBreak,
  Link,
  LinkTitle,
  ListItem,
  Mark,
  Node,
  OrderedList,
  Paragraph,
  type Plot,
  Schema,
  Strikethrough,
  Strong,
  TaskItem,
  taskListContentOverride,
  WikiLink,
  WikiLinkLabel,
} from '@bangle.io/wordgard-utils';
import type MarkdownIt from 'markdown-it';
import { defaultMarkdownSpecs } from './default-specs';
import { parseTokens } from './parser';
import {
  isMarkMarkdownSpec,
  isNodeMarkdownSpec,
  type MarkdownSpec,
  type MarkMarkdownSpec,
  type MarkTypeRef,
} from './spec';
import { MarkdownSerializerState } from './state';

/** A headless Markdown string <-> Wordgard `Plot.Doc` codec. */
export interface MarkdownCodec {
  readonly schema: Schema;
  parse(markdown: string): Plot.Doc;
  serialize(doc: Plot.Doc): string;
}

export interface MarkdownCodecOptions {
  readonly schema: Schema;
  /**
   * The node/mark markdown specs. The relative order of MARK specs defines
   * the serialization nesting order for overlapping marks (earlier =
   * outermost); see `MarkdownSerializerState.serializationMarks`.
   */
  readonly specs: readonly MarkdownSpec[];
  readonly tokenizer?: MarkdownIt;
}

/** Canonicalizes a {@link MarkTypeRef} (a `Mark.Type` or singleton `Mark`) to its `Mark.Type`. */
function markTypeOf(ref: MarkTypeRef): Mark.Type {
  return ref instanceof Mark ? ref.type : ref;
}

/**
 * Builds a Markdown codec from an explicit schema, spec set, and (optional)
 * tokenizer. Node/mark type identity — not string names — is the lookup key
 * for the serializer dispatch table, matching how specs are keyed (see
 * `spec.ts`): `Node.Type.get` and {@link markTypeOf} canonicalize a spec's
 * type-or-singleton-tag reference the same way regardless of which shape a
 * spec author used to register it.
 */
export function createMarkdownCodec(
  options: MarkdownCodecOptions,
): MarkdownCodec {
  const { schema, specs } = options;
  const tokenizer = options.tokenizer ?? createBaseMarkdownTokenizer();

  const nodeSerializers = new Map<
    Node.Type,
    Extract<MarkdownSpec, { node: unknown }>['serialize']
  >();
  const markSerializers = new Map<Mark.Type, MarkMarkdownSpec['serialize']>();

  for (const spec of specs) {
    if (isNodeMarkdownSpec(spec)) {
      nodeSerializers.set(Node.Type.get(spec.node), spec.serialize);
    } else if (isMarkMarkdownSpec(spec)) {
      markSerializers.set(markTypeOf(spec.mark), spec.serialize);
    }
  }

  const renderNode = (
    state: MarkdownSerializerState,
    node: Node,
    parent: Plot,
    index: number,
  ): void => {
    const key = node.isLeaf ? node.type : node.tag.type;
    const serialize = nodeSerializers.get(key);
    if (!serialize) {
      throw new Error(
        `Node type \`${node.name}\` not supported by Markdown serializer`,
      );
    }
    serialize(state, node, parent, index);
  };

  return {
    schema,
    parse(markdown: string): Plot.Doc {
      const tokens = tokenizer.parse(markdown, {});
      const content = parseTokens(schema, specs, tokens);
      return schema.doc(ensureNonEmptyDoc(schema, content));
    },
    serialize(doc: Plot.Doc): string {
      // A fresh state per call: the serializer accumulates output on
      // `this`, so reusing one instance across calls would leak content
      // and the delimiter stack between unrelated `serialize()` calls.
      const state = new MarkdownSerializerState(markSerializers, renderNode);
      state.renderContent(doc);
      return state.out;
    },
  };
}

/**
 * `Doc` requires at least one block child (see `Plot.defineDoc`'s
 * `canBeEmpty` default of `false`). An empty markdown string produces no
 * tokens, so we fill it with a single empty paragraph — the only place the
 * parser invents content, and it round-trips back to `''` (an empty
 * paragraph serializes to nothing).
 */
function ensureNonEmptyDoc(
  schema: Schema,
  content: readonly Node[],
): readonly Node[] {
  if (content.length > 0) return content;
  const fallback = schema.defaultContentPlot(schema.docTag.type);
  if (!fallback) {
    throw new Error(
      'Schema has no default block content to fill an empty document',
    );
  }
  return [schema.createAndFill(fallback)];
}

/**
 * The batteries-included codec for Bangle notes: the schema and Markdown
 * specs that every note's Wordgard document must round-trip through, kept
 * in one factory so `editor-w` and this package's own tests build the exact
 * same schema/tokenizer pairing.
 */
export function createNoteMarkdownCodec(): MarkdownCodec {
  const schema = Schema.define([
    Doc,
    Paragraph,
    Heading,
    Blockquote,
    CodeBlock,
    CodeBlockLanguage,
    BulletList,
    OrderedList,
    ListItem,
    TaskItem,
    taskListContentOverride,
    HorizontalRule,
    LineBreak,
    Image,
    ImageAlt,
    ImageTitle,
    LinkTitle,
    Strong,
    Emphasis,
    Strikethrough,
    Code,
    Link,
    WikiLink,
    WikiLinkLabel,
  ]);

  const tokenizer = createBaseMarkdownTokenizer().use(wikiLinkTokenizer);

  return createMarkdownCodec({
    schema,
    specs: defaultMarkdownSpecs,
    tokenizer,
  });
}
