import {
  EditorState,
  markdownLoader,
  resolve,
  Schema,
  setupBase,
  setupCollapsibleHeading,
  setupHeading,
  setupParagraph,
  TextSelection,
  type Transaction,
} from '@bangle.io/prosemirror-plugins';
import { describe, expect, it } from 'vitest';

const SOURCE = `# One

alpha

beta

## Sub

delta with plain trailing text

# Two

gamma`;

const MOVED_SOURCE = `# Two

gamma

# One

alpha

beta

## Sub

delta with plain trailing text`;

function createTestSetup() {
  const collapsible = setupCollapsibleHeading();
  const extensions = [
    setupBase(),
    setupParagraph(),
    setupHeading(),
    collapsible,
  ];
  const resolved = resolve(extensions);
  const schema = new Schema({ nodes: resolved.nodes, marks: resolved.marks });
  const markdown = markdownLoader(extensions, schema);
  return { collapsible, extensions, markdown, resolved, schema };
}

/** Creates editor state with the fold plugin active, cursor at doc start. */
function createState(source: string) {
  const { collapsible, markdown, resolved, schema } = createTestSetup();
  const state = EditorState.create({
    doc: markdown.parser.parse(source),
    schema,
    plugins: resolved.resolvePlugins({ schema }),
  });
  return { collapsible, markdown, state };
}

function headingPos(state: EditorState, text: string): number {
  let found = -1;
  state.doc.descendants((node, pos) => {
    if (
      found === -1 &&
      node.type.name === 'heading' &&
      node.textContent === text
    ) {
      found = pos;
    }
    return found === -1;
  });
  if (found === -1) {
    throw new Error(`Heading "${text}" not found`);
  }
  return found;
}

function apply(
  state: EditorState,
  command: (s: EditorState, d: (tr: Transaction) => void) => boolean,
) {
  let next = state;
  const result = command(state, (tr) => {
    next = state.apply(tr);
  });
  expect(result).toBe(true);
  return next;
}

describe('collapsible heading Markdown fidelity', () => {
  it('heading schema carries no collapse state', () => {
    const { schema } = createTestSetup();
    const attrs = Object.keys(schema.nodes.heading?.spec.attrs ?? {});
    expect(attrs).toEqual(['level']);
  });

  it('serializes the full document while a section is folded', () => {
    let { collapsible, markdown, state } = createState(SOURCE);
    state = apply(
      state,
      collapsible.command.toggleHeadingCollapseAtPos(headingPos(state, 'One')),
    );

    expect(collapsible.query.listCollapsedHeadings(state)).toHaveLength(1);
    expect(markdown.serializer.serialize(state.doc)).toBe(SOURCE);
  });

  it('round trips byte-for-byte with multiple folded sections', () => {
    let { collapsible, markdown, state } = createState(SOURCE);
    state = apply(
      state,
      collapsible.command.toggleHeadingCollapseAtPos(headingPos(state, 'Sub')),
    );
    state = apply(
      state,
      collapsible.command.toggleHeadingCollapseAtPos(headingPos(state, 'Two')),
    );

    const serialized = markdown.serializer.serialize(state.doc);
    expect(serialized).toBe(SOURCE);

    // A reload of the serialized output parses to an identical document.
    const reparsed = markdown.parser.parse(serialized);
    expect(reparsed.toJSON()).toEqual(state.doc.toJSON());
  });

  it('folding via the selection command never mutates the document', () => {
    let { collapsible, markdown, state } = createState(SOURCE);
    const docBefore = state.doc;
    state = state.apply(
      state.tr.setSelection(
        TextSelection.create(state.doc, headingPos(state, 'One') + 1),
      ),
    );
    state = apply(state, (s, d) =>
      collapsible.command.toggleHeadingCollapse(s, d),
    );

    expect(state.doc.eq(docBefore)).toBe(true);
    expect(markdown.serializer.serialize(state.doc)).toBe(SOURCE);
  });

  it('serializes folded sections exactly after moves in both directions', () => {
    const down = createState(SOURCE);
    down.state = apply(
      down.state,
      down.collapsible.command.toggleHeadingCollapseAtPos(
        headingPos(down.state, 'One'),
      ),
    );
    down.state = apply(
      down.state,
      down.collapsible.command.moveFoldedHeadingSection(
        headingPos(down.state, 'One'),
        down.state.doc.content.size,
      ),
    );
    expect(down.markdown.serializer.serialize(down.state.doc)).toBe(
      MOVED_SOURCE,
    );

    const up = createState(SOURCE);
    up.state = apply(
      up.state,
      up.collapsible.command.toggleHeadingCollapseAtPos(
        headingPos(up.state, 'Two'),
      ),
    );
    up.state = apply(
      up.state,
      up.collapsible.command.moveFoldedHeadingSection(
        headingPos(up.state, 'Two'),
        0,
      ),
    );
    expect(up.markdown.serializer.serialize(up.state.doc)).toBe(MOVED_SOURCE);
  });
});
