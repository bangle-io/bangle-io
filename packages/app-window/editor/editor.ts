import '@bangle.dev/core/style.css';

import {
  blockquote,
  bold,
  bulletList,
  code,
  codeBlock,
  hardBreak,
  heading,
  horizontalRule,
  image,
  italic,
  link,
  listItem,
  orderedList,
  paragraph,
  strike,
  underline,
} from '@bangle.dev/base-components';
import {
  BangleEditor,
  BangleEditorState,
  SpecRegistry,
} from '@bangle.dev/core';
import { markdownParser, markdownSerializer } from '@bangle.dev/markdown';

const specRegistry = new SpecRegistry([
  blockquote.spec(),
  bold.spec(),
  bulletList.spec(),
  code.spec(),
  codeBlock.spec(),
  hardBreak.spec(),
  heading.spec(),
  horizontalRule.spec(),
  image.spec(),
  italic.spec(),
  link.spec(),
  listItem.spec(),
  orderedList.spec(),
  paragraph.spec(),
  strike.spec(),
  underline.spec(),
]);
const parser = markdownParser(specRegistry);
const serializer = markdownSerializer(specRegistry);

export default function Editor(domNode: HTMLElement) {
  const state = new BangleEditorState({
    specRegistry,
    plugins: () => [
      blockquote.plugins(),
      bold.plugins(),
      bulletList.plugins(),
      code.plugins(),
      codeBlock.plugins(),
      hardBreak.plugins(),
      heading.plugins(),
      horizontalRule.plugins(),
      image.plugins(),
      italic.plugins(),
      link.plugins(),
      listItem.plugins(),
      orderedList.plugins(),
      paragraph.plugins(),
      strike.plugins(),
      underline.plugins(),
    ],
    initialValue: parser.parse(getMarkdown())!,
  });

  const editor = new BangleEditor(domNode, { state });
  return editor;
}

export function serializeMarkdown(editor: BangleEditor) {
  return serializer.serialize(editor.view.state.doc);
}

function getMarkdown() {
  return `
## H2 Heading 

### H3 Heading

## Marks

_italic_, **Bold**, _underlined_, ~~striked~~, \`code\`, [link](https://en.wikipedia.org/wiki/Main_Page)

## GFM Todo Lists

- [x] Check out BangleJS

- [ ] Walk the cat

- [ ] Drag these lists by dragging the square up or down.

- [ ] Move these lists with shortcut \`Option-ArrowUp\`. You can move any node (yes headings too) with this shortcut.

## Unordered Lists

- This is an ordered list

  - I am a nested ordered list

  - I am another nested one

    - Bunch of nesting right?

## Ordered Lists

1. Bringing order to the world.

2. Nobody remembers who came second.

   1. We can cheat to become first by nesting.

      - Oh an you can mix and match ordered unordered.

## Image
You can also directly paste images.
![](https://user-images.githubusercontent.com/6966254/101979122-f4405e80-3c0e-11eb-9bf8-9af9b1ddc94f.png)


## Blockquote

> I am a blockquote, trigger me by typing > on a new line

## Code Block

\`\`\`
// This is a code block
function foo() {
  console.log('Hello world!')
}
\`\`\`

## Paragraph

I am a boring paragraph

## Horizontal Break
---
`;
}
