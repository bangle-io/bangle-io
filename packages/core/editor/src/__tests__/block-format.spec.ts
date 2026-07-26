import { Logger } from '@bangle.io/logger';
import {
  AllSelection,
  EditorState,
  markdownLoader,
  resolve,
  Schema,
  TextSelection,
} from '@bangle.io/prosemirror-plugins';
import { describe, expect, it } from 'vitest';
import {
  isSelectionAllHeadings,
  isSelectionAllTopLevelParagraphs,
  setParagraphInSelection,
  toggleHeadingInSelection,
} from '../block-format';
import { setupExtensions } from '../extensions';

// Mirrors the app editor setup so the commands run against the real schema and
// the assertions can be made on real Markdown.
function setup() {
  const extensions = setupExtensions(
    new Logger('test', 'error'),
    () => {},
    {
      onActivate: () => {},
      resolveTarget: () => false,
      unresolvedAriaLabel: ({ displayText }) => displayText,
    },
    {
      storeFiles: async () => [],
      cleanupStoredFiles: () => {},
      resolveAssetReference: () => undefined,
    },
  );
  const resolved = resolve(extensions, false, true);
  const schema = new Schema({
    topNode: 'doc',
    nodes: resolved.nodes,
    marks: resolved.marks,
  });
  const markdown = markdownLoader([...Object.values(extensions)], schema);

  const stateFrom = (source: string, select: 'all' | [number, number]) => {
    const doc = markdown.parser.parse(source);
    return EditorState.create({
      doc,
      schema,
      selection:
        select === 'all'
          ? new AllSelection(doc)
          : TextSelection.create(doc, select[0], select[1]),
    });
  };
  const run = (state: EditorState, command: typeof setParagraphInSelection) => {
    let next = state;
    const applied = command(state, (tr) => {
      next = state.apply(tr);
    });
    return { applied, markdown: markdown.serializer.serialize(next.doc) };
  };
  return {
    stateFrom,
    run,
    serialize: markdown.serializer.serialize,
    extensions,
  };
}

describe('setParagraphInSelection', () => {
  it('leaves a code block intact when the selection spans it', () => {
    const { stateFrom, run } = setup();
    const source = 'alpha\n\n```js\nconst a = 1;\n```\n\nbravo';
    const state = stateFrom(source, 'all');

    const { applied, markdown } = run(state, setParagraphInSelection);

    // The paragraphs are already paragraphs and the code block must not be
    // rewritten, so there is nothing to do and the document is untouched.
    expect(applied).toBe(false);
    expect(markdown).toBe(source);
  });

  it('converts headings around a code block without touching the code', () => {
    const { stateFrom, run } = setup();
    const state = stateFrom(
      '# alpha\n\n```js\nconst a = 1;\n```\n\n## bravo',
      'all',
    );

    const { applied, markdown } = run(state, setParagraphInSelection);

    expect(applied).toBe(true);
    expect(markdown).toBe('alpha\n\n```js\nconst a = 1;\n```\n\nbravo');
  });

  it('leaves YAML frontmatter intact on select-all', () => {
    const { stateFrom, run } = setup();
    const source = '---\ntitle: my note\ntags: [a]\n---\n\n# alpha';
    const state = stateFrom(source, 'all');

    const { applied, markdown } = run(state, setParagraphInSelection);

    expect(applied).toBe(true);
    expect(markdown).toBe('---\ntitle: my note\ntags: [a]\n---\n\nalpha');
  });

  it('converts every item of a nested list in one transaction', () => {
    const { stateFrom, run } = setup();
    const state = stateFrom('- parent\n  - child one\n  - child two', 'all');

    const { applied, markdown } = run(state, setParagraphInSelection);

    // Regression: lifting used to collapse the selection to a cursor between
    // steps, leaving "child one" behind as a list item.
    expect(applied).toBe(true);
    expect(markdown).toBe('parent\n\nchild one\n\nchild two');
  });

  it('flattens a list nested in a blockquote', () => {
    const { stateFrom, run } = setup();
    const state = stateFrom('> - item', 'all');

    const { applied, markdown } = run(state, setParagraphInSelection);

    expect(applied).toBe(true);
    expect(markdown).toBe('item');
  });

  it('reports unavailable when the selection is already plain paragraphs', () => {
    const { stateFrom, run } = setup();
    const state = stateFrom('alpha\n\nbravo', 'all');

    const { applied, markdown } = run(state, setParagraphInSelection);

    expect(applied).toBe(false);
    expect(markdown).toBe('alpha\n\nbravo');
    expect(isSelectionAllTopLevelParagraphs(state)).toBe(true);
  });

  it('flattens a list even when an un-liftable block precedes it', () => {
    const { stateFrom, run } = setup();
    // Table cells are textblocks that cannot be lifted. Aborting on the first
    // one left every later block nested, so the list here stayed a list and the
    // control reported nothing to do.
    const state = stateFrom(
      '| h |\n| --- |\n| cell |\n\n- item one\n- item two',
      'all',
    );

    const { applied, markdown } = run(state, setParagraphInSelection);

    expect(applied).toBe(true);
    expect(markdown).toBe('| h |\n| --- |\n| cell |\n\nitem one\n\nitem two');
  });

  it('does not report success after a partial conversion', () => {
    const { stateFrom, run } = setup();
    const state = stateFrom(
      '# head\n\n| h |\n| --- |\n| cell |\n\n- item one',
      'all',
    );

    const { applied, markdown } = run(state, setParagraphInSelection);

    // The heading converting while the list stayed nested was the silent
    // partial conversion this command exists to prevent.
    expect(applied).toBe(true);
    expect(markdown).toBe('head\n\n| h |\n| --- |\n| cell |\n\nitem one');
  });

  it('keeps marks and links while converting a heading', () => {
    const { stateFrom, run } = setup();
    const state = stateFrom('## **bold** and [link](http://x.com/)', 'all');

    const { markdown } = run(state, setParagraphInSelection);

    expect(markdown).toBe('**bold** and [link](http://x.com/)');
  });
});

describe('availability dry-run', () => {
  // The toolbar asks without a dispatch to decide whether a control is enabled.
  // That answer is computed from the document rather than by building the
  // transaction, so it has to agree with what dispatching actually does —
  // otherwise a control is offered that does nothing, or withheld when it would
  // have worked.
  const documents = [
    ['plain paragraphs', 'alpha\n\nbravo'],
    ['heading', '# alpha'],
    ['nested list', '- parent\n  - child one\n  - child two'],
    ['list in blockquote', '> - item'],
    ['deeply nested', `${'> '.repeat(10)}- deep item`],
    ['code block only', '```js\nconst a = 1;\n```'],
    ['frontmatter only', '---\ntitle: t\n---'],
    ['table only', '| h |\n| --- |\n| cell |'],
    ['table then list', '| h |\n| --- |\n| cell |\n\n- item'],
    ['heading, table, list', '# head\n\n| h |\n| --- |\n| cell |\n\n- item'],
    ['paragraph and code block', 'alpha\n\n```js\nconst a = 1;\n```'],
  ] as const;

  for (const [name, source] of documents) {
    it(`reports the same availability as dispatching for ${name}`, () => {
      const { stateFrom, run } = setup();
      const state = stateFrom(source, 'all');

      const available = setParagraphInSelection(state);
      const { applied } = run(state, setParagraphInSelection);

      expect(available).toBe(applied);
    });
  }
});

describe('heading keybinding command', () => {
  // Mod-Alt-1/2/3 goes through banger-editor's own toggleHeading, not the
  // toolbar. It used to rewrite every textblock in range, so a select-all
  // turned fenced code and frontmatter into headings.
  it('leaves code blocks and frontmatter alone', () => {
    const { stateFrom, run, extensions } = setup();
    const source =
      '---\ntitle: my note\n---\n\nalpha\n\n```js\nconst a = 1;\n```';
    const state = stateFrom(source, 'all');

    const { applied, markdown } = run(
      state,
      extensions.heading.command.toggleHeading(1),
    );

    expect(applied).toBe(true);
    expect(markdown).toBe(
      '---\ntitle: my note\n---\n\n# alpha\n\n```js\nconst a = 1;\n```',
    );
  });
});

describe('heading active state', () => {
  it('does not depend on which end the selection started from', () => {
    const { stateFrom } = setup();
    const source = 'alpha\n\n## bravo';
    const forward = stateFrom(source, 'all');
    const doc = forward.doc;
    const backward = EditorState.create({
      doc,
      schema: forward.schema,
      selection: TextSelection.create(doc, doc.content.size - 1, 1),
    });

    // A mixed paragraph + heading selection is not "all H2" either way round.
    expect(isSelectionAllHeadings(forward, 2)).toBe(false);
    expect(isSelectionAllHeadings(backward, 2)).toBe(false);
  });

  it('applies one level to the whole mixed selection in a single click', () => {
    const { stateFrom, run } = setup();
    const state = stateFrom('alpha\n\n## bravo', 'all');

    const { applied, markdown } = run(state, toggleHeadingInSelection(2));

    expect(applied).toBe(true);
    expect(markdown).toBe('## alpha\n\n## bravo');
  });

  it('clears back to paragraphs without lifting out of a list', () => {
    const { stateFrom, run } = setup();
    const state = stateFrom('- # alpha', 'all');

    expect(isSelectionAllHeadings(state, 1)).toBe(true);
    const { applied, markdown } = run(state, toggleHeadingInSelection(1));

    expect(applied).toBe(true);
    expect(markdown).toBe('- alpha');
  });
});
