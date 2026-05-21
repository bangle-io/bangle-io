import { describe, expect, test } from 'vitest';
import { getResolvedNoteLinkWsPathCandidates } from '../note-links';

describe('note link helpers', () => {
  test('resolves relative markdown links against current note directory', () => {
    expect(
      getResolvedNoteLinkWsPathCandidates(
        'notion:OFFSEC/PEN200/Desafios/Challenge 2 - RELIA/192.168.__.189/MAILDMZ.md',
        '../../../../../_FERRAMENTAS/swarks',
      ),
    ).toEqual([
      'notion:_FERRAMENTAS/swarks.md',
      'notion:_FERRAMENTAS/swarks.markdown',
    ]);
  });

  test('supports markdown escaped underscores in links', () => {
    expect(
      getResolvedNoteLinkWsPathCandidates(
        'notion:dir/sub/note.md',
        '../../\\_FERRAMENTAS/swarks',
      ),
    ).toEqual([
      'notion:_FERRAMENTAS/swarks.md',
      'notion:_FERRAMENTAS/swarks.markdown',
    ]);
  });

  test('returns exact wsPath when link already has extension', () => {
    expect(
      getResolvedNoteLinkWsPathCandidates(
        'notion:dir/note.md',
        '../_FERRAMENTAS/swarks.md',
      ),
    ).toEqual(['notion:_FERRAMENTAS/swarks.md']);
  });

  test('decodes encoded paths', () => {
    expect(
      getResolvedNoteLinkWsPathCandidates(
        'notion:dir/note.md',
        '../My%20Folder/My%20Note',
      ),
    ).toEqual([
      'notion:My Folder/My Note.md',
      'notion:My Folder/My Note.markdown',
    ]);
  });

  test('ignores external and hash links', () => {
    expect(
      getResolvedNoteLinkWsPathCandidates(
        'notion:dir/note.md',
        'https://example.com',
      ),
    ).toEqual([]);
    expect(
      getResolvedNoteLinkWsPathCandidates('notion:dir/note.md', '#section'),
    ).toEqual([]);
  });
});
