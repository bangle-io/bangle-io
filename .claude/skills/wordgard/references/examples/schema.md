!{"type": "examples", "title": "Schema Example", "deriveTOC": true, "injectCode": ["dino.ts", "outliner.ts", "inline.ts"], "importmap": true}

# Example: Schema

Every Wordgard editor has a {@link Schema schema}, which sets the set
of content elements (node and mark types) that may occur in its
document, and the relationships between those.

<hr class=floral>

<section>

## Configuring your Schema

The easiest way to declare your editor's schema is to include one of
the basic schema bundles ({@link basicSchema}, {@link fullSchema}, or
{@link inlineSchema}) in your configuration, and then add additional
elements as desired.

```javascript
import {basicSchema, orderedList, bulletList} from "wordgard/schema"
import {Wordgard} from "wordgard/editor"

const wg = Wordgard.create({
  doc: "<ul><li>Item A</li><li>Item B</li></ul>",
  config: [
    basicSchema(),
    orderedList({blockItems: false}),
    bulletList({blockItems: false})
  ]
})
```

Some of these support additional configuration, which you can only
provide when adding them directly. In this case, we're setting the
list types, which normally support block content in their items, to
use items with inline content.

If you need to include a raw node or mark type in your configuration,
you have to wrap it in {@link GardState.schemaElement}.

In cases where you need to access the schema before creating the
editor state, you can start by resolving a configuration, use the
schema it defines, and then create a state with it.

```typescript
import {GardState} from "wordgard/state"
import {basicSchema, alignment} from "wordgard/schema"
import {Paragraph} from "wordgard/types"
import {Leaf} from "wordgard/doc"
import {Wordgard} from "wordgard/editor"

const config = GardState.Configuration.create([
  basicSchema(),
  alignment()
])

const schema = config.schema!

// Do stuff with the schema
const doc = schema.doc([
  Paragraph.create([Leaf.text("hi")])
])

const wg = Wordgard.create({doc, config})
```

It is also possible to create a schema without a configuration, by
directly calling {@link Schema.define}. Here you cannot provide editor
extensions, but have to pass in the actual schema elements (either
from [`"wordgard/types"`](../../docs/ref/#types) or custom
definitions).

```typescript
import {Schema} from "wordgard/doc"
import {Doc, Paragraph, Strong} from "wordgard/types"

const schema = Schema.define([
  Doc,
  Paragraph,
  Strong
])
```

This is mostly useful in scripts that aren't actually creating an
editor, such as node scripts that work with Wordgard documents.

</section>

<hr class=floral>

<section>

## Custom Element

It is often important to be able to include dinosaurs in rich text
documents. So in this example we'll create a custom leaf type for
them.

!leaf

This is a simple inline leaf definition that takes one of a set of
dinosaur names as parameter, and renders itself as a `<document-dino
data-name="Triceratops">` element.

We'll define a set of styles that actually make such an element like a
dinosaur.

!styles

The user will need to insert dinosaurs, so let's add a simple
insertion command.

!insert

We'll make that command accessible through the menu. For submenus like
this one, where we know in advance what content it should contain, it
is often practical to just immediately {@link
Menu.Submenu.Spec.content provide} the content directly in the
definition.

!menu

That gives us the features we need. For convenience, we gather them up
in a bundle function.

!bundle

Adding that to an editor makes it behave like this:

<div id=dino-editor></div>

</section>

<hr class=floral>

<section>

## List-Only Schema

Let's go through an example that changes the schema structure. For an
outliner-style editor, we want to make it so that the top level of a
document is always a list.

We can use the existing list plot definitions, but must change their
relationships. The default {@link Doc} plot allows content of type
{@link Node.Group.Content}, which is a group used for generic
block-level content. In our editor we want to narrow that to just
{@link BulletList}.

```javascript
config: [
  basicSchema(),
  bulletList(),
  GardState.schemaElement.of(
    Schema.Override.plotContent(Doc, BulletList)),
  /* ... */
]
```

That already works pretty well. Except that once you use backspace to
merge two list items, it becomes very hard to start a new item,
because the default {@link enter} command does not know how to behave
in a schema like this.

Let's add a handler that makes it split a list item when used in an
empty textblock that's in a top-level list item but not the first
block of the item.

!enter

With that tweak, we get a passable list-only editor.

<div id=outliner-editor></div>

</section>

<hr class=floral>

<section>

## Inline Schema

It is possible to set up a Wordgard schema where the document is a
single textblock, using {@link inlineSchema} or {@link InlineDoc} (or
defining your own doc type).

With a little bit of styling you can also make such an editor look
like a rich-text enabled input field.

!inlineEditor

And there we go: inline rich text fields.

<div style="border: 1px solid silver; padding: 0 20px">
  <p>Enter a title: <span id=title></span></p>
  <p>And a name: <span id=name></span></p>
  <p><button id=submit>Submit</button></p>
</div>

Even if the input is plain text, when you need to show widgets or
other decorations in it as part of your editing interface it can be
practical to use a Wordgard editor.

</section>

<script src="./dino.js" type=module></script>
<script src="./outliner.js" type=module></script>
<script src="./inline.js" type=module></script>
