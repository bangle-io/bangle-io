import { describe, expect, it } from 'vitest';
import { planNoteRelocationReferenceRewrite } from '../note-relocation-reference-rewrite';

const source = 'notes:projects/drafts/relocate.md';
const destination = 'notes:archive/2026/relocate.md';

function plan(markdown: string, existingWsPaths: readonly string[]) {
  return planNoteRelocationReferenceRewrite({
    markdown,
    source,
    destination,
    existingWsPaths: [source, ...existingWsPaths],
  });
}

describe('planNoteRelocationReferenceRewrite', () => {
  it('rewrites explicit wiki paths while preserving aliases and fragments', () => {
    const result = plan(
      [
        '[[./sibling|Sibling label]]',
        '[[../shared/overview.md#section-two|Overview]]',
        '[[/reference/guide#intro]]',
        '[[bare note|Never rewrite this]]',
      ].join('\n\n'),
      [
        'notes:projects/drafts/sibling.md',
        'notes:projects/shared/overview.md',
        'notes:reference/guide.md',
        'notes:bare note.md',
      ],
    );

    expect(result.markdown).toBe(
      [
        '[[../../projects/drafts/sibling.md|Sibling label]]',
        '[[../../projects/shared/overview.md#section-two|Overview]]',
        '[[../../reference/guide.md#intro]]',
        '[[bare note|Never rewrite this]]',
      ].join('\n\n'),
    );
    expect(result.rewrittenReferences).toBe(3);
    expect(result.warnings).toEqual([]);
  });

  it('rewrites direct Markdown notes, images, and local files with URL-safe paths', () => {
    const result = plan(
      [
        '[Roadmap](./Roadmap%202026.md#future)',
        '![Diagram](../assets/na%C3%AFve%20diagram.png "Keep title")',
        '[PDF](/assets/Project%20Plan.pdf)',
      ].join('\n\n'),
      [
        'notes:projects/drafts/Roadmap 2026.md',
        'notes:projects/assets/naïve diagram.png',
        'notes:assets/Project Plan.pdf',
      ],
    );

    expect(result.markdown).toBe(
      [
        '[Roadmap](../../projects/drafts/Roadmap%202026.md#future)',
        '![Diagram](../../projects/assets/na%C3%AFve%20diagram.png "Keep title")',
        '[PDF](../../assets/Project%20Plan.pdf)',
      ].join('\n\n'),
    );
    expect(result.rewrittenReferences).toBe(3);
  });

  it('uses the existing local-file resolver ordering for non-root copied paths', () => {
    const result = plan('[File](docs/setup.pdf)', [
      'notes:projects/drafts/docs/setup.pdf',
      'notes:docs/setup.pdf',
    ]);

    expect(result.markdown).toBe(
      '[File](../../projects/drafts/docs/setup.pdf)',
    );
  });

  it('skips containers and uncertain inline syntax without warning', () => {
    const markdown = [
      '---',
      'related: [[./frontmatter]]',
      '---',
      '',
      '> ```md',
      '> [[./quoted-fence]]',
      '> ```',
      '',
      '> > ```md',
      '> > [[./nested-fence]]',
      '> > ```',
      '',
      '- list item',
      '  [continuation](./list.md)',
      '',
      '<span>context</span> [adjacent](./html.md)',
      '',
      '[[ ./spaced-target ]]',
      '',
      '`[[./inline-code]]` and `[code](./code.md)`',
      '',
      '[reference]: ./reference.md',
    ].join('\n');

    const result = plan(markdown, [
      'notes:projects/drafts/frontmatter.md',
      'notes:projects/drafts/quoted-fence.md',
      'notes:projects/drafts/nested-fence.md',
      'notes:projects/drafts/list.md',
      'notes:projects/drafts/html.md',
      'notes:projects/drafts/spaced-target.md',
      'notes:projects/drafts/inline-code.md',
      'notes:projects/drafts/code.md',
      'notes:projects/drafts/reference.md',
    ]);

    expect(result.markdown).toBe(markdown);
    expect(result.rewrittenReferences).toBe(0);
    expect(result.unsupportedReferences).toBe(0);
    expect(result.warnings).toEqual([]);
  });

  it('warns only for an extensionless target recognized in a safe line', () => {
    const result = plan(
      ['[extensionless](./extensionless)', '', '> [[./quoted-missing]]'].join(
        '\n',
      ),
      ['notes:projects/drafts/extensionless.md'],
    );

    expect(result.markdown).toBe(
      '[extensionless](./extensionless)\n\n> [[./quoted-missing]]',
    );
    expect(result.rewrittenReferences).toBe(0);
    expect(result.unsupportedReferences).toBe(1);
    expect(result.warnings).toEqual([
      { kind: 'unsupported-reference', count: 1 },
    ]);
  });

  it('changes only destination spans and preserves CRLF byte-for-byte elsewhere', () => {
    const markdown =
      'Before  [[./target|Alias]]  after ![Alt](../assets/picture.png "Title")\r\n';
    const result = plan(markdown, [
      'notes:projects/drafts/target.md',
      'notes:projects/assets/picture.png',
    ]);

    expect(result.markdown).toBe(
      'Before  [[../../projects/drafts/target.md|Alias]]  after ![Alt](../../projects/assets/picture.png "Title")\r\n',
    );
    expect(result.markdown).toContain('Before  [[');
    expect(result.markdown).toContain('|Alias]]  after ![Alt](');
    expect(result.markdown.endsWith(' "Title")\r\n')).toBe(true);
  });

  it('leaves same-path and cross-workspace inputs unchanged', () => {
    const markdown = '[[./target]]';
    expect(
      planNoteRelocationReferenceRewrite({
        markdown,
        source,
        destination: source,
        existingWsPaths: [source, 'notes:projects/drafts/target.md'],
      }),
    ).toEqual({
      markdown,
      rewrittenReferences: 0,
      unsupportedReferences: 0,
      warnings: [],
    });
    expect(
      planNoteRelocationReferenceRewrite({
        markdown,
        source,
        destination: 'other:relocate.md',
        existingWsPaths: [source, 'notes:projects/drafts/target.md'],
      }),
    ).toEqual({
      markdown,
      rewrittenReferences: 0,
      unsupportedReferences: 0,
      warnings: [],
    });
  });
});
