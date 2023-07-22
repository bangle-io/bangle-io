import { heading } from '@bangle.dev/base-components';
import type { SpecRegistry } from '@bangle.dev/core';
import * as markdown from '@bangle.dev/markdown';
import type { Node } from '@bangle.dev/pm';
import { Fragment, Slice } from '@bangle.dev/pm';
import { findChildren } from '@bangle.dev/utils';

const { flattenFragmentJSON } = heading;
const LOG = false;
let log = LOG ? console.log.bind(console, 'editor/markdown-parser') : () => {};

const setupSerializer = () => {
  let _serializer: undefined | ReturnType<typeof markdown.markdownSerializer>,
    _specRegistry: undefined | SpecRegistry;

  return (specRegistry: SpecRegistry) => {
    if (specRegistry !== _specRegistry) {
      log('setting up serializer');
      _serializer = markdown.markdownSerializer(specRegistry);
    }

    return _serializer;
  };
};

const setupGetParser = () => {
  const setupParser = (
    specRegistry: SpecRegistry,
    markdownItPlugins: any[],
  ) => {
    log('setting up parser');
    let tokenizer = markdown.getDefaultMarkdownItTokenizer();
    markdownItPlugins.forEach((plugin: any) => {
      // to allow passing of plugin options
      if (Array.isArray(plugin)) {
        tokenizer = tokenizer.use(...plugin);
      } else {
        tokenizer = tokenizer.use(plugin);
      }
    });

    return markdown.markdownParser(specRegistry, tokenizer);
  };

  let _parser: undefined | ReturnType<typeof setupParser>,
    _specRegistry: SpecRegistry | undefined,
    _markdownItPlugins: any[] | undefined;

  return (specRegistry: SpecRegistry, markdownItPlugins: any[]) => {
    if (
      specRegistry !== _specRegistry ||
      markdownItPlugins !== _markdownItPlugins
    ) {
      _parser = setupParser(specRegistry, markdownItPlugins);
      _specRegistry = specRegistry;
      _markdownItPlugins = markdownItPlugins;
    }

    return _parser;
  };
};

const getParser = setupGetParser();
const getSerializer = setupSerializer();

export const markdownParser = (
  markdownStr: string,
  specRegistry: SpecRegistry,
  markdownItPlugins: any[],
) => {
  const parser = getParser(specRegistry, markdownItPlugins);

  return parser?.parse(markdownStr) ?? undefined;
};

export const markdownSerializer = (doc: Node, specRegistry: SpecRegistry) => {
  doc = uncollapseHeadings(doc, specRegistry);

  const text = getSerializer(specRegistry)?.serialize(doc);

  return text;
};

// TODO need to improve this
function listCollapsedHeading(doc: Node, specRegistry: SpecRegistry) {
  return findChildren(
    doc,
    (node) =>
      node.type === specRegistry.schema.nodes.heading &&
      Boolean(node.attrs.collapseContent),
    false,
  );
}

function uncollapseHeadings(doc: Node, specRegistry: SpecRegistry) {
  const collapsedHeadingSet = new Set(
    listCollapsedHeading(doc, specRegistry).map((r) => r.node),
  );

  if (collapsedHeadingSet.size === 0) {
    return doc;
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
          specRegistry.schema.nodes.heading!.createChecked(
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

  return doc;
}
