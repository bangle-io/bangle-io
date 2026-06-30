import { createWikiLinkIndex, WsFilePath } from '@bangle.io/ws-path';
import { describe, expect, it } from 'vitest';
import { extractLinkedWsPathsFromMarkdown } from '../backlink-markdown-extractor';

describe('extractLinkedWsPathsFromMarkdown', () => {
  const source = WsFilePath.fromString('notes:source.md');
  const target = WsFilePath.fromString('notes:target.md');
  const nestedTarget = WsFilePath.fromString('notes:folder/nested.md');
  const index = createWikiLinkIndex([source, target, nestedTarget], 'notes');

  it('extracts exact wiki and Markdown links to existing notes', () => {
    expect(
      extractLinkedWsPathsFromMarkdown({
        currentWsPath: source,
        index,
        markdown: [
          'A [[target]] link.',
          'A [[target|custom label]] link.',
          'A [Markdown link](target.md).',
          'An Obsidian-style [Markdown link without extension](target).',
          'A [nested path](folder/nested).',
        ].join('\n'),
      }),
    ).toEqual(['notes:target.md', 'notes:folder/nested.md']);
  });

  it('resolves extensionless Markdown links to an existing .markdown note', () => {
    const markdownTarget = WsFilePath.fromString('notes:Target.markdown');
    const markdownOnlyIndex = createWikiLinkIndex(
      [source, markdownTarget],
      'notes',
    );

    expect(
      extractLinkedWsPathsFromMarkdown({
        currentWsPath: source,
        index: markdownOnlyIndex,
        markdown: 'See [Target](Target).',
      }),
    ).toEqual(['notes:Target.markdown']);
  });

  it('leaves ambiguous extensionless Markdown links unresolved', () => {
    const markdownTarget = WsFilePath.fromString('notes:Target.markdown');
    const mdTarget = WsFilePath.fromString('notes:Target.md');
    const ambiguousIndex = createWikiLinkIndex(
      [source, mdTarget, markdownTarget],
      'notes',
    );

    expect(
      extractLinkedWsPathsFromMarkdown({
        currentWsPath: source,
        index: ambiguousIndex,
        markdown: 'See [Target](Target).',
      }),
    ).toEqual([]);
  });

  it('ignores plain mentions, code, images, and unresolved links', () => {
    expect(
      extractLinkedWsPathsFromMarkdown({
        currentWsPath: source,
        index,
        markdown: [
          'target is just plain text.',
          '`[[target]]` and `[target](target.md)` are code.',
          '```md',
          '[[target]]',
          '```',
          '![[target]]',
          '![target](target.md)',
          '[[missing]]',
        ].join('\n'),
      }),
    ).toEqual([]);
  });

  it('ignores links that resolve back to the current note', () => {
    expect(
      extractLinkedWsPathsFromMarkdown({
        currentWsPath: source,
        index,
        markdown: [
          '[Intro](#intro)',
          '[Current file](source.md)',
          '[[source]]',
          '[Other note](target.md)',
        ].join('\n'),
      }),
    ).toEqual(['notes:target.md']);
  });

  it('ignores escaped Markdown links', () => {
    expect(
      extractLinkedWsPathsFromMarkdown({
        currentWsPath: source,
        index,
        markdown: [
          String.raw`\[target](target.md) is escaped text.`,
          String.raw`\\[target](target.md) is a link after an escaped backslash.`,
        ].join('\n'),
      }),
    ).toEqual(['notes:target.md']);
  });

  it('ignores wiki syntax inside Markdown link labels', () => {
    expect(
      extractLinkedWsPathsFromMarkdown({
        currentWsPath: source,
        index,
        markdown: [
          '[ordinary [[target]]](https://example.com)',
          '[local [[target]]](folder/nested.md)',
        ].join('\n'),
      }),
    ).toEqual(['notes:folder/nested.md']);
  });

  it('resolves current-note-relative and root-relative links', () => {
    const nestedSource = WsFilePath.fromString('notes:folder/source.md');
    const sibling = WsFilePath.fromString('notes:folder/sibling.md');
    const root = WsFilePath.fromString('notes:root.md');
    const pathIndex = createWikiLinkIndex(
      [nestedSource, sibling, root],
      'notes',
    );

    expect(
      extractLinkedWsPathsFromMarkdown({
        currentWsPath: nestedSource,
        index: pathIndex,
        markdown: [
          'Wiki sibling: [[./sibling]]',
          'Markdown sibling: [sibling](./sibling.md)',
          'Wiki root: [[/root]]',
          'Markdown root: [root](/root.md)',
        ].join('\n'),
      }),
    ).toEqual(['notes:folder/sibling.md', 'notes:root.md']);
  });
});
