import { describe, expect, it } from 'vitest';
import { htmlFromMarkdown, markdownFromHTML } from '../remark';

describe('Markdown <-> HTML conversion', () => {
  describe('markdownFromHTML', () => {
    it('converts basic text', () => {
      const html = '<p>Hello World</p>';
      expect(markdownFromHTML(html)).toBe('Hello World\n');
    });

    it('converts headings', () => {
      const html = '<h1>Title</h1><h2>Subtitle</h2>';
      expect(markdownFromHTML(html)).toBe('# Title\n\n## Subtitle\n');
    });

    it('converts task lists', () => {
      const html =
        '<ul><li data-list-kind="task" data-list-checked=""><p>Done task</p></li><li data-list-kind="task"><p>Pending task</p></li></ul>';
      expect(markdownFromHTML(html).trim()).toBe(
        '- [x] Done task\n- [ ] Pending task',
      );
    });

    it('converts collapsed lists', () => {
      const html =
        '<div><ul><li class="prosemirror-flat-list" data-list-kind="bullet" data-list-collapsable=""><p>Collapsed item</p><ul><li class="prosemirror-flat-list" data-list-kind="bullet"><p>Nested item</p></li></ul></li></ul></div>';
      const result = markdownFromHTML(html);
      expect(result).toContain('- Collapsed item');
      expect(result).toContain('  - Nested item');
    });

    it('preserves ordered lists with custom order', () => {
      const html =
        '<div><ol><li class="prosemirror-flat-list" data-list-kind="ordered"><p>First</p></li><li class="prosemirror-flat-list" data-list-kind="ordered"><p>Second</p></li><li class="prosemirror-flat-list" data-list-kind="ordered"><p>Third</p></li></ol></div>';
      const result = markdownFromHTML(html);
      expect(result.trim()).toBe('1. First\n2. Second\n3. Third');
    });

    it('handles deeply nested ordered lists', () => {
      const html =
        '<div><ol><li class="prosemirror-flat-list" data-list-kind="ordered" data-list-collapsable=""><p>First</p><ol><li class="prosemirror-flat-list" data-list-kind="ordered"><p>Nested First</p></li><li class="prosemirror-flat-list" data-list-kind="ordered"><p>Nested Second</p></li></ol></li><li class="prosemirror-flat-list" data-list-kind="ordered"><p>Second</p></li></ol></div>';
      const result = markdownFromHTML(html);
      expect(result.trim()).toBe(
        '1. First\n   1. Nested First\n   2. Nested Second\n2. Second',
      );
    });

    it('converts normal lists without task attributes', () => {
      const html =
        '<div><ul><li class="prosemirror-flat-list" data-list-kind="bullet"><p>Item 1</p></li><li class="prosemirror-flat-list" data-list-kind="bullet"><p>Item 2</p></li></ul></div>';
      const result = markdownFromHTML(html).trim();
      expect(result).toBe('- Item 1\n- Item 2');
    });

    it('handles inline formatting in task items', () => {
      const html =
        '<div><ul><li class="prosemirror-flat-list" data-list-kind="task" data-list-checked=""><p>This is <strong>bold</strong></p></li><li class="prosemirror-flat-list" data-list-kind="task"><p>This is <em>italic</em></p></li></ul></div>';
      const result = markdownFromHTML(html).trim();
      expect(result).toBe('- [x] This is **bold**\n- [ ] This is *italic*');
    });

    it('handles non-list HTML gracefully', () => {
      const html = '<p>No lists here, just <strong>bold</strong> text.</p>';
      const result = markdownFromHTML(html).trim();
      expect(result).toBe('No lists here, just **bold** text.');
    });

    it('handles complex nested lists with mixed types', () => {
      const html =
        '<div><ol><li class="prosemirror-flat-list" data-list-kind="ordered" data-list-collapsable=""><p>sdsd</p><ol><li class="prosemirror-flat-list" data-list-kind="ordered"><p>sdsds</p></li><li class="prosemirror-flat-list" data-list-kind="ordered" data-list-collapsable=""><p>sdsd</p><ol><li class="prosemirror-flat-list" data-list-kind="ordered" data-list-collapsable=""><p>hello world</p><ol><li class="prosemirror-flat-list" data-list-kind="ordered"><p>sdsldks</p></li><li class="prosemirror-flat-list" data-list-kind="ordered"><p>sdsd:s</p></li></ol><ul><li class="prosemirror-flat-list" data-list-kind="bullet"><p>sldkalsdk lsad</p></li><li class="prosemirror-flat-list" data-list-kind="bullet"><p>asldkas ldk as</p></li><li class="prosemirror-flat-list" data-list-kind="bullet"><p>alskdlas d</p></li><li class="prosemirror-flat-list" data-list-kind="task"><p>sldksldkalsd</p></li><li class="prosemirror-flat-list" data-list-kind="task" data-list-checked=""><p>alsdklas dk&nbsp;</p></li><li class="prosemirror-flat-list" data-list-kind="task"><p>asdasd</p></li><li class="prosemirror-flat-list" data-list-kind="task" data-list-collapsable=""><p>lsadklasd</p><ul><li class="prosemirror-flat-list" data-list-kind="task"><p>slasdklsakd</p></li><li class="prosemirror-flat-list" data-list-kind="bullet"><p>asdasdsad</p></li></ul><ol><li class="prosemirror-flat-list" data-list-kind="ordered"><p>sdsdsd</p></li><li class="prosemirror-flat-list" data-list-kind="ordered"><p>sdsd</p></li><li class="prosemirror-flat-list" data-list-kind="ordered"><p>asdlasld</p></li></ol></li></ul></li></ol></li></ol></li></ol></div>';
      const result = markdownFromHTML(html);
      expect(result.trim()).toMatchInlineSnapshot(`
        "1. sdsd
           1. sdsds
           2. sdsd
              1. hello world
                 1. sdsldks
                 2. sdsd:s
                 - sldkalsdk lsad
                 - asldkas ldk as
                 - alskdlas d
                 - [ ] sldksldkalsd
                 - [x] alsdklas dk 
                 - [ ] asdasd
                 - [ ] lsadklasd
                   - [ ] slasdklsakd
                   - asdasdsad
                   1. sdsdsd
                   2. sdsd
                   3. asdlasld"
      `);
    });
    it('handles complex nested lists with mixed types', () => {
      const html =
        '<div><ol><li class="prosemirror-flat-list" data-list-kind="ordered" data-list-collapsable=""><p>sdsd</p><ol><li class="prosemirror-flat-list" data-list-kind="ordered"><p>sdsds</p></li><li class="prosemirror-flat-list" data-list-kind="ordered" data-list-collapsable=""><p>sdsd</p><ol><li class="prosemirror-flat-list" data-list-kind="ordered" data-list-collapsable=""><p>hello world</p><ol><li class="prosemirror-flat-list" data-list-kind="ordered"><p>sdsldks</p></li><li class="prosemirror-flat-list" data-list-kind="ordered"><p>sdsd:s</p></li></ol><ul><li class="prosemirror-flat-list" data-list-kind="bullet"><p>sldkalsdk lsad</p></li><li class="prosemirror-flat-list" data-list-kind="bullet"><p>asldkas ldk as</p></li><li class="prosemirror-flat-list" data-list-kind="bullet"><p>alskdlas d</p></li><li class="prosemirror-flat-list" data-list-kind="bullet"><p>sldksldkalsd</p></li><li class="prosemirror-flat-list" data-list-kind="bullet" data-list-collapsable=""><p>&nbsp;sdsldksldksld</p><p>alsdkmlaskd asAS</p><p>saldksaldkasl</p></li><li class="prosemirror-flat-list" data-list-kind="bullet"><p>alsdklas dk&nbsp;</p></li><li class="prosemirror-flat-list" data-list-kind="bullet"><h1>sdlsdlksdlk</h1></li><li class="prosemirror-flat-list" data-list-kind="bullet"><p>&nbsp;&gt; lalsdsad</p></li><li class="prosemirror-flat-list" data-list-kind="bullet"><blockquote><p>alkssdlksld</p><blockquote><p>sadasdas</p></blockquote></blockquote></li><li class="prosemirror-flat-list" data-list-kind="bullet"><p>asdasd</p></li><li class="prosemirror-flat-list" data-list-kind="bullet" data-list-collapsable=""><p>lsadklasd</p><ul><li class="prosemirror-flat-list" data-list-kind="task"><p>slasdklsakd</p></li><li class="prosemirror-flat-list" data-list-kind="bullet"><p>asdasdsad</p></li></ul><ol><li class="prosemirror-flat-list" data-list-kind="ordered"><p>sdsdsd</p></li><li class="prosemirror-flat-list" data-list-kind="ordered"><p>sdsd</p></li><li class="prosemirror-flat-list" data-list-kind="ordered"><p>asdlasld</p></li></ol></li></ul></li></ol></li></ol></li></ol></div>';
      const result = markdownFromHTML(html);
      expect(result.trim()).toMatchInlineSnapshot(`
        "1. sdsd
           1. sdsds
           2. sdsd
              1. hello world
                 1. sdsldks
                 2. sdsd:s
                 - sldkalsdk lsad
                 - asldkas ldk as
                 - alskdlas d
                 - sldksldkalsd
                 -  sdsldksldksld

                   alsdkmlaskd asAS

                   saldksaldkasl
                 - alsdklas dk 
                 - # sdlsdlksdlk
                 -  > lalsdsad
                 - > alkssdlksld
                   >
                   > > sadasdas
                 - asdasd
                 - lsadklasd
                   - [ ] slasdklsakd
                   - asdasdsad
                   1. sdsdsd
                   2. sdsd
                   3. asdlasld"
      `);
    });

    it('handles empty content gracefully', () => {
      expect(markdownFromHTML('')).toBe('');
      expect(markdownFromHTML('<p></p>')).toBe('');
      expect(markdownFromHTML('<p> </p>')).toBe('');
    });

    it('handles complex inline formatting', () => {
      const html =
        '<p>This is <strong><em>bold italic</em></strong> and <code>code</code> with <a href="https://example.com">link</a></p>';
      expect(markdownFromHTML(html).trim()).toBe(
        'This is ***bold italic*** and `code` with [link](https://example.com)',
      );
    });

    it('handles nested blockquotes with formatting', () => {
      const html =
        '<blockquote><p>Level 1</p><blockquote><p><strong>Level 2</strong></p><blockquote><p><em>Level 3</em></p></blockquote></blockquote></blockquote>';
      expect(markdownFromHTML(html).trim()).toBe(
        '> Level 1\n>\n> > **Level 2**\n> >\n> > > *Level 3*',
      );
    });

    it('handles code blocks with language', () => {
      const html =
        '<pre><code class="language-javascript">const x = 1;\nconsole.log(x);</code></pre>';
      expect(markdownFromHTML(html).trim()).toBe(
        '```javascript\nconst x = 1;\nconsole.log(x);\n```',
      );
    });

    it('handles GFM tables', () => {
      const html =
        '<table><thead><tr><th>Header 1</th><th>Header 2</th></tr></thead><tbody><tr><td>Cell 1</td><td>Cell 2</td></tr></tbody></table>';
      expect(markdownFromHTML(html).trim()).toBe(
        '| Header 1 | Header 2 |\n| -------- | -------- |\n| Cell 1   | Cell 2   |',
      );
    });

    it('handles mixed content types', () => {
      const html = `
        <h1>Title</h1>
        <p>Normal paragraph</p>
        <blockquote><p>Quote</p></blockquote>
        <ul>
          <li data-list-kind="task" data-list-checked=""><p><strong>Done</strong> task</p></li>
          <li data-list-kind="bullet"><p>Bullet point</p></li>
        </ul>
        <pre><code>Code block</code></pre>
      `;
      const result = markdownFromHTML(html).trim();
      expect(result).toContain('# Title');
      expect(result).toContain('Normal paragraph');
      expect(result).toContain('> Quote');
      expect(result).toContain('- [x] **Done** task');
      expect(result).toContain('- Bullet point');
      expect(result).toContain('```\nCode block\n```');
    });

    it('handles special characters and escaping', () => {
      const html =
        '<p>* Not a list & [not a link] &amp; &lt;not html&gt; \\*escaped\\*</p>';
      expect(markdownFromHTML(html).trim()).toMatchInlineSnapshot(
        `"\\* Not a list & \\[not a link] & \\<not html> \\\\\\*escaped\\\\\\*"`,
      );
    });

    it('preserves whitespace in specific contexts', () => {
      const html = '<pre><code>  indented\n    more indented</code></pre>';
      expect(markdownFromHTML(html).trim()).toBe(
        '```\n  indented\n    more indented\n```',
      );
    });

    it('handles empty list items and nested structures', () => {
      const html = `
        <ul>
          <li data-list-kind="bullet"><p></p></li>
          <li data-list-kind="bullet"><p>Item</p>
            <ul>
              <li data-list-kind="bullet"><p></p></li>
            </ul>
          </li>
        </ul>
      `;
      expect(markdownFromHTML(html).trim()).toBe('-\n- Item\n  -');
    });

    it('handles complex task list scenarios', () => {
      const html = `
        <ul>
          <li data-list-kind="task" data-list-checked=""><p>Completed with <code>code</code></p>
            <ul>
              <li data-list-kind="task"><p><em>Pending nested</em></p>
                <ul>
                  <li data-list-kind="bullet"><p>Regular nested</p></li>
                </ul>
              </li>
            </ul>
          </li>
        </ul>
      `;
      expect(markdownFromHTML(html).trim()).toBe(
        '- [x] Completed with `code`\n  - [ ] *Pending nested*\n    - Regular nested',
      );
    });
  });
});
