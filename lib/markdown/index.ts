import { heading } from '@bangle.dev/base-components';
import * as markdown from '@bangle.dev/markdown';
import { Fragment, Slice } from '@bangle.dev/pm';
import { findChildren } from '@bangle.dev/utils';

const { flattenFragmentJSON } = heading;
const LOG = false;
let log = LOG ? console.log.bind(console, 'editor/markdown-parser') : () => {};

const setupSerializer = () => {
  let _serializer, _specRegistry;

  return (specRegistry) => {
    if (specRegistry !== _specRegistry) {
      log('setting up serializer');
      _serializer = markdown.markdownSerializer(specRegistry);
    }
    return _serializer;
  };
};

const setupGetParser = () => {
  const setupParser = (specRegistry, markdownItPlugins) => {
    log('setting up parser');
    let tokenizer = markdown.getDefaultMarkdownItTokenizer();
    markdownItPlugins.forEach((plugin) => {
      // to allow passing of plugin options
      if (Array.isArray(plugin)) {
        tokenizer = tokenizer.use(...plugin);
      } else {
        tokenizer = tokenizer.use(plugin);
      }
    });
    return markdown.markdownParser(specRegistry, tokenizer);
  };

  let _parser, _specRegistry, _markdownItPlugins;

  return (specRegistry, markdownItPlugins) => {
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
  markdownStr,
  specRegistry,
  markdownItPlugins,
) => {
  return getParser(specRegistry, markdownItPlugins).parse(markdownStr);
};

export const markdownSerializer = (doc, specRegistry) => {
  doc = uncollapseHeadings(doc, specRegistry);

  const text = getSerializer(specRegistry).serialize(doc);

  return text;
};

// TODO need to improve this
function listCollapsedHeading(doc, specRegistry) {
  return findChildren(
    doc,
    (node) =>
      node.type === specRegistry.schema.nodes.heading &&
      Boolean(node.attrs.collapseContent),
    false,
  );
}

function uncollapseHeadings(doc, specRegistry) {
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

  return doc;
}
