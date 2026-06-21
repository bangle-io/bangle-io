import { MarkdownSerializer } from 'prosemirror-markdown';
import { describe, expect, it } from 'vitest';
import { setupBase } from '../../base';
import { setupBold } from '../../bold';
import { resolve } from '../../common';
import { setupParagraph } from '../../paragraph';
import { EditorState, Schema, TextSelection } from '../../pm';
import {
  expandLinkSelection,
  getLinkRangeAtSelection,
  setupLink,
} from '../link';

const base = setupBase();
const paragraph = setupParagraph();
const bold = setupBold();
const link = setupLink();
const collections = [base, paragraph, bold, link];
const resolved = resolve(collections);
const schema = new Schema({
  nodes: resolved.nodes,
  marks: resolved.marks,
});
const markdown = new MarkdownSerializer(
  Object.fromEntries(
    Object.entries(resolved.markdown.nodes ?? {}).map(([name, config]) => [
      name,
      config.toMarkdown,
    ]),
  ),
  Object.fromEntries(
    Object.entries(resolved.markdown.marks ?? {}).map(([name, config]) => [
      name,
      config.toMarkdown,
    ]),
  ),
);

function stateWith(
  children: Parameters<typeof schema.node>[2],
  from: number,
  to = from,
) {
  const doc = schema.node('doc', null, [
    schema.node('paragraph', null, children),
  ]);
  return EditorState.create({
    doc,
    schema,
    selection: TextSelection.create(doc, from, to),
  });
}

function linkedText(
  text: string,
  href: string,
  extraMarks: Array<ReturnType<typeof schema.mark>> = [],
) {
  return schema.text(text, [
    schema.mark('link', { href, title: null }),
    ...extraMarks,
  ]);
}

describe('link ranges', () => {
  it('expands full, partial, and cursor selections across other marks', () => {
    const href = 'https://example.com';
    const children = [
      linkedText('one', href),
      linkedText('two', href, [schema.mark('bold')]),
      linkedText('three', href),
    ];

    expect(getLinkRangeAtSelection(stateWith(children, 1, 12))).toEqual({
      from: 1,
      to: 12,
      href,
      title: null,
    });
    expect(getLinkRangeAtSelection(stateWith(children, 2, 5))).toEqual({
      from: 1,
      to: 12,
      href,
      title: null,
    });
    expect(getLinkRangeAtSelection(stateWith(children, 5))).toEqual({
      from: 1,
      to: 12,
      href,
      title: null,
    });
    expect(getLinkRangeAtSelection(stateWith(children, 12))).toBeUndefined();
  });

  it('keeps adjacent links with different attributes separate', () => {
    const children = [
      linkedText('first', 'https://one.example'),
      linkedText('second', 'https://two.example'),
    ];

    expect(getLinkRangeAtSelection(stateWith(children, 1, 6))).toMatchObject({
      from: 1,
      to: 6,
      href: 'https://one.example',
    });
    expect(getLinkRangeAtSelection(stateWith(children, 1, 12))).toBeUndefined();
  });

  it('rejects link/plain, plain, and multi-block selections', () => {
    const mixed = stateWith(
      [linkedText('linked', 'https://example.com'), schema.text(' plain')],
      2,
      13,
    );
    expect(getLinkRangeAtSelection(mixed)).toBeUndefined();
    expect(
      getLinkRangeAtSelection(stateWith([schema.text('plain')], 1, 6)),
    ).toBeUndefined();

    const doc = schema.node('doc', null, [
      schema.node('paragraph', null, [
        linkedText('one', 'https://example.com'),
      ]),
      schema.node('paragraph', null, [
        linkedText('two', 'https://example.com'),
      ]),
    ]);
    const state = EditorState.create({
      doc,
      schema,
      selection: TextSelection.create(doc, 1, 8),
    });
    expect(getLinkRangeAtSelection(state)).toBeUndefined();
  });

  it('supports dry-run and dispatched expansion without changing the doc', () => {
    const state = stateWith(
      [linkedText('linked', 'https://example.com')],
      2,
      4,
    );
    expect(expandLinkSelection()(state)).toBe(true);

    let nextState = state;
    expect(
      expandLinkSelection()(state, (transaction) => {
        nextState = state.apply(transaction);
      }),
    ).toBe(true);
    expect(nextState.doc.eq(state.doc)).toBe(true);
    expect(nextState.selection.from).toBe(1);
    expect(nextState.selection.to).toBe(7);
  });
});

describe('link commands and Markdown', () => {
  it('creates, replaces, edits a partial link, and removes it exactly', () => {
    let state = stateWith([schema.text('hello')], 1, 6);
    const dispatch = (transaction: Parameters<typeof state.apply>[0]) => {
      state = state.apply(transaction);
    };

    expect(
      link.command.createLink('https://one.example')(state, dispatch),
    ).toBe(true);
    expect(markdown.serialize(state.doc)).toBe('[hello](https://one.example)');

    state = state.apply(
      state.tr.setSelection(TextSelection.create(state.doc, 2, 4)),
    );
    expect(
      link.command.updateLink('https://two.example')(state, dispatch),
    ).toBe(true);
    expect(markdown.serialize(state.doc)).toBe('[hello](https://two.example)');

    expect(link.command.updateLink(undefined)(state, dispatch)).toBe(true);
    expect(markdown.serialize(state.doc)).toBe('hello');
  });

  it('replaces links across a mixed selected range', () => {
    let state = stateWith(
      [linkedText('linked', 'https://one.example'), schema.text(' plain')],
      1,
      13,
    );
    link.command.createLink('https://two.example')(state, (transaction) => {
      state = state.apply(transaction);
    });
    expect(markdown.serialize(state.doc)).toBe(
      '[linked plain](https://two.example)',
    );
  });
});
