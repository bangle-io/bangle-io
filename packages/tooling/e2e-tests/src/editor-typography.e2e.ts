import { expect, type Locator, test } from '@playwright/test';
import {
  createBrowserWorkspaceAndNote,
  getEditorLocator,
  writeStoredMarkdown,
} from './common';

type TypographyMetrics = {
  fontSize: string;
  lineHeight: string;
  marginBottom: string;
  marginTop: string;
  paddingBottom: string;
  paddingTop: string;
};

async function getTypographyMetrics(
  locator: Locator,
): Promise<TypographyMetrics> {
  return locator.evaluate((element) => {
    const style = getComputedStyle(element);
    return {
      fontSize: style.fontSize,
      lineHeight: style.lineHeight,
      marginBottom: style.marginBottom,
      marginTop: style.marginTop,
      paddingBottom: style.paddingBottom,
      paddingTop: style.paddingTop,
    };
  });
}

async function expectVerticalGap(
  previousBlock: Locator,
  heading: Locator,
  expectedGap: number,
) {
  await expect
    .poll(async () => {
      const previousBox = await previousBlock.boundingBox();
      const headingBox = await heading.boundingBox();

      if (!previousBox || !headingBox) {
        return undefined;
      }

      return headingBox.y - (previousBox.y + previousBox.height);
    })
    .toBe(expectedGap);
}

test('uses a consistent type scale and spacing rhythm for headings', async ({
  page,
}) => {
  const workspaceName = 'editor-heading-spacing';
  const noteName = 'Home';
  await createBrowserWorkspaceAndNote(page, { workspaceName, noteName });
  await writeStoredMarkdown(
    page,
    workspaceName,
    noteName,
    [
      '# Page title',
      '',
      'Paragraph before H1.',
      '',
      '# Section',
      '',
      'Paragraph before H2.',
      '',
      '## Subsection',
      '',
      'Paragraph before H3.',
      '',
      '### Third level',
      '',
      'Paragraph before H4.',
      '',
      '#### Fourth level',
      '',
      'Paragraph before H5.',
      '',
      '##### Fifth level',
      '',
      'Paragraph before H6.',
      '',
      '###### Sixth level',
      '',
      'Body after H6.',
    ].join('\n'),
  );
  await page.reload();

  const editor = getEditorLocator(page, {});
  const headingExpectations = [
    {
      fontSize: '36px',
      level: 1,
      marginBottom: '16px',
      marginTop: '32px',
      name: 'Section',
      previous: 'Paragraph before H1.',
    },
    {
      fontSize: '24px',
      level: 2,
      marginBottom: '8px',
      marginTop: '24px',
      name: 'Subsection',
      previous: 'Paragraph before H2.',
    },
    {
      fontSize: '20px',
      level: 3,
      marginBottom: '8px',
      marginTop: '20px',
      name: 'Third level',
      previous: 'Paragraph before H3.',
    },
    {
      fontSize: '18px',
      level: 4,
      marginBottom: '8px',
      marginTop: '16px',
      name: 'Fourth level',
      previous: 'Paragraph before H4.',
    },
    {
      fontSize: '16px',
      level: 5,
      marginBottom: '8px',
      marginTop: '12px',
      name: 'Fifth level',
      previous: 'Paragraph before H5.',
    },
    {
      fontSize: '14px',
      level: 6,
      marginBottom: '8px',
      marginTop: '12px',
      name: 'Sixth level',
      previous: 'Paragraph before H6.',
    },
  ] as const;

  await expect(
    editor.getByRole('heading', { level: 1, name: 'Page title' }),
  ).toHaveCSS('padding-top', '24px');

  for (const expectation of headingExpectations) {
    const heading = editor
      .locator(`h${expectation.level}`)
      .filter({ hasText: expectation.name });
    await expect(heading).toHaveCSS('font-size', expectation.fontSize);
    await expect(heading).toHaveCSS('margin-top', expectation.marginTop);
    await expect(heading).toHaveCSS('margin-bottom', expectation.marginBottom);
    await expectVerticalGap(
      editor.getByText(expectation.previous, { exact: true }),
      heading,
      Number.parseFloat(expectation.marginTop),
    );
  }
});

test('keeps supported block and inline nodes on a coherent typography rhythm', async ({
  page,
}) => {
  const workspaceName = 'editor-node-typography';
  const noteName = 'All nodes';
  await createBrowserWorkspaceAndNote(page, { workspaceName, noteName });
  await writeStoredMarkdown(
    page,
    workspaceName,
    noteName,
    [
      '---',
      'title: Typography',
      '---',
      '',
      'Body with `inline code`, [[Wiki Target]], $x + y$, \\$5, and ![alt](missing.png).\\',
      'After a hard break.',
      '',
      '> Quoted paragraph.',
      '',
      '- Bullet item',
      '- [ ] Task item',
      '',
      '1. Ordered item',
      '1. Second ordered item',
      '',
      '```ts',
      'const value = 1;',
      '```',
      '',
      '$$',
      'x^2 + y^2',
      '$$',
      '',
      '| Column A | Column B |',
      '| --- | --- |',
      '| Cell A | Cell B |',
      '',
      '---',
      '',
      'Final paragraph.',
      '',
      '1. # List heading 1',
      '1. ## List heading 2',
      '1. ### List heading 3',
      '1. #### List heading 4',
      '1. ##### List heading 5',
      '1. ###### List heading 6',
    ].join('\n'),
  );
  await page.reload();

  const editor = getEditorLocator(page, {});
  const bodyParagraph = editor.locator('p').filter({ hasText: 'Body with' });
  const expectedMetrics = [
    {
      locator: editor.locator('pre[data-frontmatter]'),
      metrics: {
        fontSize: '16px',
        lineHeight: '24px',
        marginBottom: '8px',
        marginTop: '8px',
        paddingBottom: '15.2px',
        paddingTop: '40.8px',
      },
    },
    {
      locator: bodyParagraph,
      metrics: {
        fontSize: '16px',
        lineHeight: '24px',
        marginBottom: '0px',
        marginTop: '0px',
        paddingBottom: '8px',
        paddingTop: '8px',
      },
    },
    {
      locator: editor.locator('blockquote'),
      metrics: {
        fontSize: '16px',
        lineHeight: '24px',
        marginBottom: '0px',
        marginTop: '0px',
        paddingBottom: '0px',
        paddingTop: '0px',
      },
    },
    {
      locator: editor.locator('.prosemirror-flat-list').filter({
        hasText: 'Bullet item',
      }),
      metrics: {
        fontSize: '16px',
        lineHeight: '24px',
        marginBottom: '0px',
        marginTop: '0px',
        paddingBottom: '0px',
        paddingTop: '0px',
      },
    },
    {
      locator: editor.locator('pre:not([data-frontmatter])'),
      metrics: {
        fontSize: '16px',
        lineHeight: '24px',
        marginBottom: '8px',
        marginTop: '8px',
        paddingBottom: '15.2px',
        paddingTop: '40.8px',
      },
    },
    {
      locator: editor.locator('math-display'),
      metrics: {
        fontSize: '16px',
        lineHeight: '24px',
        marginBottom: '8px',
        marginTop: '8px',
        paddingBottom: '12px',
        paddingTop: '12px',
      },
    },
    {
      locator: editor.locator('table'),
      metrics: {
        fontSize: '16px',
        lineHeight: '24px',
        marginBottom: '8px',
        marginTop: '8px',
        paddingBottom: '0px',
        paddingTop: '0px',
      },
    },
    {
      locator: editor.locator('hr'),
      metrics: {
        fontSize: '16px',
        lineHeight: '24px',
        marginBottom: '16px',
        marginTop: '16px',
        paddingBottom: '0px',
        paddingTop: '0px',
      },
    },
  ] as const;

  for (const expectation of expectedMetrics) {
    await expect(expectation.locator).toHaveCount(1);
    expect(await getTypographyMetrics(expectation.locator)).toEqual(
      expectation.metrics,
    );
  }

  const inlineExpectations = [
    {
      fontSize: '15.2px',
      lineHeight: '22.8px',
      locator: editor.locator('code:not(pre code)'),
    },
    {
      fontSize: '16px',
      lineHeight: '24px',
      locator: editor.locator('math-inline'),
    },
    {
      fontSize: '16px',
      lineHeight: '24px',
      locator: editor.locator('math-inline .math-render'),
    },
    {
      fontSize: '16px',
      lineHeight: '24px',
      locator: editor.locator('[data-math-escaped-dollar]'),
    },
    {
      fontSize: '16px',
      lineHeight: '24px',
      locator: editor.locator('.wiki-link'),
    },
    {
      fontSize: '16px',
      lineHeight: '24px',
      locator: editor.getByRole('img', { name: 'alt' }),
    },
    {
      fontSize: '16px',
      lineHeight: '24px',
      locator: bodyParagraph.locator('br'),
    },
  ] as const;

  for (const expectation of inlineExpectations) {
    await expect(expectation.locator).toHaveCount(1);
    await expect(expectation.locator).toHaveCSS(
      'font-size',
      expectation.fontSize,
    );
    await expect(expectation.locator).toHaveCSS(
      'line-height',
      expectation.lineHeight,
    );
  }

  const tableHeader = editor.getByRole('columnheader', { name: 'Column A' });
  const tableCell = editor.getByRole('cell', { name: 'Cell A' });
  await expect(tableHeader).toHaveCSS('font-size', '16px');
  await expect(tableHeader).toHaveCSS('line-height', '24px');
  await expect(tableCell).toHaveCSS('font-size', '16px');
  await expect(tableCell).toHaveCSS('line-height', '24px');
  await expect(editor.locator('pre:not([data-frontmatter]) code')).toHaveCSS(
    'font-size',
    '15.2px',
  );

  const listHeadingAlignment = await editor
    .locator('.prosemirror-flat-list')
    .evaluateAll((items) =>
      items.flatMap((item) => {
        const heading = item.querySelector('h1,h2,h3,h4,h5,h6');
        if (!heading) {
          return [];
        }
        const itemBox = item.getBoundingClientRect();
        const headingBox = heading.getBoundingClientRect();
        const markerStyle = getComputedStyle(item, '::before');
        const markerTop = Number.parseFloat(markerStyle.top);
        const markerLineHeight = Number.parseFloat(markerStyle.lineHeight);
        const markerCenter = markerTop + markerLineHeight / 2;
        const headingCenter =
          headingBox.top - itemBox.top + headingBox.height / 2;

        return [
          {
            alignmentDelta: Math.abs(markerCenter - headingCenter),
            paddingTop: getComputedStyle(heading).paddingTop,
          },
        ];
      }),
    );

  expect(listHeadingAlignment).toHaveLength(6);
  for (const metrics of listHeadingAlignment) {
    expect(metrics.paddingTop).toBe('0px');
    expect(metrics.alignmentDelta).toBeLessThanOrEqual(1);
  }
});
