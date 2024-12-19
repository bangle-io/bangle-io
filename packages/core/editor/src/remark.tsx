import type { ProseMirrorNode, Schema } from '@prosekit/pm/model';
import { type NodeJSON, htmlFromNode, jsonFromHTML } from 'prosekit/core';
import { ListDOMSerializer } from 'prosekit/extensions/list';

import rehypeParse from 'rehype-parse';
import rehypeRemark from 'rehype-remark';
import remarkGfm from 'remark-gfm';
import remarkHtml from 'remark-html';
import remarkParse from 'remark-parse';
import remarkStringify from 'remark-stringify';

import type { ListItem, RootContent } from 'mdast';
import { type Plugin, type Transformer, unified } from 'unified';
import { visit } from 'unist-util-visit';

/**
 * Transformer to set `checked` on list items if `dataListKind` is "task".
 * Runs before `remarkGfm` so that GFM can convert them to `[ ]` or `[x]`.
 */
const listItemTransformer: Plugin = () => {
  return ((tree) => {
    visit(tree, 'listItem', (node: ListItem) => {
      const hProps = node.data?.hProperties as
        | Record<string, unknown>
        | undefined;
      if (!hProps) return;
      if (hProps.dataListKind === 'task') {
        node.checked = hProps.dataListChecked === true;
      }
    });
  }) as Transformer;
};

/**
 * Convert HTML to Markdown, preserving task info and using `remarkGfm` for task lists.
 */
export function markdownFromHTML(html: string): string {
  return unified()
    .use(rehypeParse, { fragment: true })
    .use(rehypeRemark, {
      handlers: {
        li: (state, node) => {
          const children = state.all(node);
          const isBlockNode = (n: RootContent) =>
            [
              'paragraph',
              'list',
              'heading',
              'blockquote',
              'code',
              'thematicBreak',
              'table',
            ].includes(n.type);

          const hasBlock = children.some((child) => isBlockNode(child));

          // Wrap children in a paragraph if no block-level content
          if (!hasBlock) {
            const paragraph = { type: 'paragraph', children: [...children] };
            children.length = 0;
            children.push(paragraph as RootContent);
          }

          const { dataListKind } = node.properties || {};
          const dataListChecked =
            (node.properties && 'dataListChecked' in node.properties) || false;

          const result: ListItem = {
            type: 'listItem',
            spread: false,
            checked: null,
            children: children as ListItem['children'],
            data: { hProperties: { dataListKind, dataListChecked } },
          };
          state.patch(node, result);
          return result;
        },
        ul: (state, node) => {
          const children = state.all(node);

          // biome-ignore lint/suspicious/noExplicitAny: <explanation>
          const unorderedList: any = {
            type: 'list',
            ordered: false,
            spread: false,
            children,
          };
          state.patch(node, unorderedList);
          return unorderedList;
        },
        ol: (state, node) => {
          const children = state.all(node);
          // biome-ignore lint/suspicious/noExplicitAny: <explanation>
          const orderedList: any = {
            type: 'list',
            ordered: true,
            spread: false,
            children,
          };
          state.patch(node, orderedList);
          return orderedList;
        },
      },
    })
    .use(listItemTransformer)
    .use(remarkGfm)
    .use(remarkStringify, {
      bullet: '-',
      fences: true,
      listItemIndent: 'one',
    })
    .processSync(html)
    .toString();
}

/**
 * Convert Markdown to HTML (GFM HTML).
 */
export function htmlFromMarkdown(markdown: string): string {
  console.log('htmlFromMarkdown', markdown);

  return unified()
    .use(remarkParse)
    .use(remarkGfm)
    .use(remarkHtml, { allowDangerousHtml: true })
    .processSync(markdown)
    .toString();
}

/**
 * Convert ProseMirror doc to Markdown.
 */
export function docToMarkdown(doc: ProseMirrorNode): string {
  const html = htmlFromNode(doc, { DOMSerializer: ListDOMSerializer });
  return markdownFromHTML(html);
}

/**
 * Convert Markdown to a ProseMirror-compatible JSON doc.
 */
export function markdownToDoc(markdown: string, schema: Schema): NodeJSON {
  const html = htmlFromMarkdown(markdown);
  return jsonFromHTML(html, { schema });
}
