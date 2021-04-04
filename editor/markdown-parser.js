import * as markdown from '@bangle.dev/markdown/index';
import { defaultMarkdownItTokenizer } from '@bangle.dev/markdown/index';
import { emojiMarkdownItPlugin } from '@bangle.dev/emoji/index';
import { frontMatterMarkdownItPlugin } from '@bangle.dev/markdown-front-matter';
import { findChildren } from '@bangle.dev/core/prosemirror/utils';
import { Fragment, Slice } from '@bangle.dev/core/prosemirror/model';
import { flattenFragmentJSON } from '@bangle.dev/core/components/heading';
import { specRegistry } from './spec-sheet';

const parser = markdown.markdownParser(
  specRegistry,
  defaultMarkdownItTokenizer
    .use(emojiMarkdownItPlugin)
    .use(frontMatterMarkdownItPlugin),
);

const serializer = markdown.markdownSerializer(specRegistry);

export const markdownParser = (markdownStr) => parser.parse(markdownStr);
export const markdownSerializer = (doc) => {
  const collapsedHeadingSet = new Set(
    listCollapsedHeading(doc).map((r) => r.node),
  );

  let text;

  if (collapsedHeadingSet.size === 0) {
    text = serializer.serialize(doc);
    return text;
  }

  let frag = Fragment.empty;

  doc.forEach((node) => {
    if (!collapsedHeadingSet.has(node)) {
      frag = frag.append(Fragment.from(node));
      return;
    }

    frag = frag
      .append(
        Fragment.from(
          specRegistry.schema.nodes.heading.createChecked(
            {
              ...node.attrs,
              collapseContent: null,
            },
            node.content,
          ),
        ),
      )
      .append(
        Fragment.fromJSON(
          specRegistry.schema,
          flattenFragmentJSON(node.attrs.collapseContent),
        ),
      );
  });

  doc = doc.replace(0, doc.content.size, new Slice(frag, 0, 0));

  text = serializer.serialize(doc);

  return text;
};

// TODO need to improve this
function listCollapsedHeading(doc) {
  return findChildren(
    doc,
    (node) =>
      node.type === specRegistry.schema.nodes.heading &&
      Boolean(node.attrs.collapseContent),
    false,
  );
}
