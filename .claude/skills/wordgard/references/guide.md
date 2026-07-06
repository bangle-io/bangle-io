!{"type": "docs", "title": "Wordgard System Guide", "deriveTOC": true}

# System Guide

This guide provides a prose description of Wordgard's design and
functionality. For an item-by-item documentation of the programming
interface, see the [reference manual](../ref/). For more detailed
descriptions of specific parts of the system, try the
[examples](../../examples/).

<figure><img src="../../img/gate.jpg" alt="" style="width: 100%"></figure>

Wordgard is a rich text editor system with a focus on customizability.
Its intended use case is the editing of content that fits a specific
schema, rather than a generic
[WYSIWYG](https://en.wikipedia.org/wiki/WYSIWYG) or HTML editor. It
tries to provide a WYSIWYG-inspired interface, but describes content
and editing actions in terms of semantic concepts (headers, lists,
emphasis) instead of presentation concepts (font family, paragraph
indentation, bold text).

<section>

## Introduction

The central thing that this library provides is a user interface
component, implemented in the {@link Wordgard} class. This component
displays an editor using in a web document.

It also defines a set of abstractions for defining documents, editor
states, and editor actions, most of which can be used outside of the
browser.

To start using Wordgard, you need to install the `"wordgard"` package
from [npm](https://npmjs.com/package/wordgard). The actual library is
made up of a handful of separate modules inside that package, with
names like `"wordgard/editor"` or `"wordgard/doc"`. You import from
those to use the library. This code sets up a basic editor:

```javascript
import {Wordgard, menuBar} from "wordgard/editor"
import {fullSchema} from "wordgard/schema"
import {history} from "wordgard/history"

let editor = Wordgard.create({
  doc: `<p>Starting content</p>`,
  config: [
    fullSchema(), // A predefined document schema
    history(),    // Enable the undo history
    menuBar()     // Show a menu
  ],
  parent: document.body
})
```

When doing non-trivial work with this library, it is very much
recommended to use [TypeScript](https://www.typescriptlang.org/). The
pieces fit together in rather intricate ways, and having reliable
autocompletion and type errors is going to save you a _lot_ of time.

The main concepts in this system are:

 - The custom [document data structure](#h-document) used by the
   editor. Though conversion to and from HTML is supported, the editor
   stores its content using a custom immutable tree type.

 - [Schemas](#h-schema) specify what the content of the editor may
   look like. The library comes with a bunch of predefined schema
   elements (things like paragraphs, lists, links, images, emphasized
   text), and you can [define your own](../../examples/schema/) to
   support other types of content.

 - The editor is configured by a collection of extensions. These
   determine almost everything about its behavior, from the schema to
   the visible UI elements to the way browser events are handled.

 - The editor state holds the configuration, current document,
   selection, and any other values that need to be tracked to
   represent the editing state. Extensions can include their own bits
   of state. State changes happen through transactions, which are
   objects containing a precise description of the changes.

 - The editor component displays an editor state in a browser
   document, and helps translate user interaction into state
   transactions.

Because the system is very open, and as much as possibly of its
functionality is written using the public programming interface, the
full API is rather large. For simple applications, you can get away
with using only a handful of concepts. But when you do need to do
ambitious custom things, you'll be able to.

This library makes enthusiastic use of [TypeScript
namespaces](../faq/#h-dont-you-know-typescript-namespaces-are-bad-for-tree-shaking)
to nest related functionality. This may seem a bit unconventional at
times, but I find it helps avoid excessively long lists of imports,
and makes it easier to find things through autocompletion.

</section>

<hr class="floral">

<section>

## Documents

A Wordgard document is a tree, with nested structure like lists or
tables represented in the tree structure (a paragraph in a list
actually has that list as its parent node). Changing a document
involves creating a new tree, though that tree will generally share a
lot of nodes with the original document.

### Value Type

Though the structure of the document tree superficially resembles that
of the browser DOM, it is used in a very different way. It uses _value
semantics_, meaning that a node object expresses a piece of document
structure, but does not have a significant identity. A given object
never changes, so when a node or its content is updated, a new object
is created. Similarly, it is possible for the same node object to
occur multiple times in a document. For these reasons, you cannot use
a given node's JavaScript object as a useful way to identify that
specific node. You should use a [document offset](#h-index-system)
instead.

Nodes do not have a parent pointer. Since they will be reused in
changed versions of the document, they do not have a single stable
parent.

In the same vein, you cannot _change_ a node. You can change a
document by applying a [change](#h-changes) to create a new document,
but there's no `setAttribute` or `removeChild` action to take on a
node in isolation.

### Tree Structure

Wordgard defines two types of nodes:

 - _Plots_ have content. These contain a part of the document, and
   generally assign some meaning to it (such as it being a heading,
   list, or table). The document itself is a plot.

 - _Leaves_ are nodes without content. These represent things like
   line breaks, images, and text.

<figure class=float-right style="margin-top: 0"><img src="../../img/hawthorn.jpg" alt="" style="width: 230px" loading=lazy></figure>

Use of the exotic term "plot" was motivated by the fact that there's
no nice, short word in computer science tradition for internal tree
nodes (as opposed to external leaf nodes), and the metaphor of a
document consisting of plots with leaves in it pleasantly fits the
library's garden theme.

The two types of nodes are represented with different object types
({@link Plot} and {@link Leaf}). Many systems give the two a largely
compatible interface, but I found that the difference between them was
often significant enough that forcing a clear separation avoids a lot
of category errors when working with nodes.

Each node has a {@link Node.Type type} associated with it. This
describes whether it is a leaf or a plot, whether it is a block or
inline node, how to convert it to and from HTML, what content it
allows (if a plot), and so on. A node type may allow a parameter,
which is a value that is stored in the node. A heading plot may use
this to specify the heading level, for example, or an image leaf the
image URI.

On top of a type and a parameter, every node may store a set of
_marks_. These act a bit like additional parameters, except that they
are defined separately, outside of the node type. This is used for
things like inline styles (emphasis, links, superscript), text
alignment, image alt text, and so on. Like nodes, marks have a {@link
Mark.Type type} and a parameter.

Text nodes are a special kind of leaf node. They have a fixed,
built-in {@link Leaf.Text leaf type}, and their parameter is their
text content. Such nodes are automatically merged when two adjacent
ones occur with the same marks, so that stretches of text with the
same style are always a single leaf.

In this system, the term _tag_ refers to a node's markup: a node type,
a parameter, and a set of marks. For a leaf, that is all the node is.
A plot is a plot tag plus an array of content nodes.

This diagram shows a sketch of Wordgard's node representation. The the
blue boxes plot tags (with their content below them), the purple boxes
leaves. White boxes are leaf or tag parameters, and orange boxes
represent marks.

<style>
  .box {
    border-radius: 10px;
    color: white;
    padding: 4px;
    display: flex;
    flex-direction: column;
    gap: 5px;
    font-size: 0.85rem;
  }
  .box.plot { padding: 0; }
  .box.tag { background: #58d; flex-direction: row; }
  .box.leaf { background: #66b; flex-direction: row; }
  .box.type { font-weight: bold; }
  .box.mark { background: #d94; padding: 3px 10px; }
  .box.param { background: white; color: black; padding: 3px 10px; }
  .box.content { padding: 0 0 0 10px; }
</style>

<div class="box plot doc">
  <div class="box tag">
    <div class="box type">Doc</div>
  </div>
  <div class="box content">
    <div class="box plot">
      <div class="box tag">
        <div class="box type">Heading</div>
        <div class="box param">2</div>
        <div class="box mark">Alignment: center</div>
      </div>
      <div class="box content">
        <div class="box leaf">
          <div class="box type">Text</div>
          <div class="box param">"The "</div>
        </div>
        <div class="box leaf">
          <div class="box type">Text</div>
          <div class="box param">"Document"</div>
          <div class="box mark">Emphasis</div>
          <div class="box mark">Underline</div>
        </div>
      </div>
    </div>
  </div>
  <div class="box content">
    <div class="box plot">
      <div class="box tag">
        <div class="box type">Paragraph</div>
      </div>
      <div class="box content">
        <div class="box leaf">
          <div class="box type">Text</div>
          <div class="box param">"Paragraph content"</div>
        </div>
        <div class="box leaf">
          <div class="box type">Image</div>
          <div class="box param">"flower.jpg"</div>
          <div class="box mark">Alt: "monk's cress flower"</div>
        </div>
      </div>
    </div>
  </div>
</div>

In the programming model, plots are objects of type {@link Plot}, with
{@link Plot.tag} and {@link Plot.content} properties. The content
contains other plots or {@link Leaf} nodes. Both leaves and plot tags
have {@link Node.Tag.Shared.type `type`}, {@link Node.Tag.Shared.param
`param`}, and {@link Node.Tag.Shared.marks `marks`} properties.

On nodes and tag/leaf objects, the {@link Node.Shared.isPlot
`isPlot`}/{@link Node.Shared.isLeaf `isLeaf`} properties can be used
to tell whether the object is a plot or leaf. In TypeScript, this
check will automatically narrow the type so that you can access its
leaf or plot-specific properties.

The library distinguishes between inline and block content, so every
node is marked as either being inline or being a block. A given plot's
content must either be all inline nodes or all block nodes. The term
_textblock_ is used for block nodes with inline content (such as
paragraphs, headings, or code blocks).

The document representation is designed in such a way that a given
document has a single canonical representation. Unlike HTML's
free-form nesting of inline style tags, mark structure is flat, and
marks are ordered in a deterministic way. This makes it easier to
compare and reason about content.

### Index System

To be able to refer to positions in the content, Wordgard uses an
index system that assigns a number to every position in the document.
It conceptually counts tokens from the start of the document, and
works like this:

 * The start of the document, right before the first content, is
   position 0.

 * Each plot has an open token and a close token. So entering or
   leaving a plot adds one to the index.

 * Each (UTF16) character in a text leaf counts as one token. So if a
   paragraph at the start of the document contains the word “hi”,
   position 1 is the start of the paragraph, position 2 is after the
   “h”, position 3 after the “i”, and position 4 after the whole
   paragraph.

 * Leaves that are not text leaves always count as a single token.

So if you have a document that, when expressed as HTML, would look
like this:

```html
<blockquote><p>Text <img src="..."></p></blockquote>
```

The token sequence, with positions, looks like this:

    0            1   2 3 4 5 6 7     8    9             10
     <blockquote> <p> T e x t _ <img> </p> </blockquote>

Each node has a {@link Node.Shared.length `length`} property that
gives you the size of the entire node. Plots also have a {@link
Plot.contentLength} property with the total length of their content.
For normal plots, their total length is their content length plus two.
The document plot is different—because its start/end tokens are not
part of the actual document, its length is equal to its content
length.

Interpreting such positions manually involves quite a lot of counting.
There is a {@link Pos resolved position} abstraction that directly
gives you the context of a given document position. You get it by
calling {@link Plot.Doc.resolve `doc.resolve(pos)`} and it will tell
you where you are in the position's parent node, where that parent
starts, what further ancestor nodes there are, what nodes sit directly
next to the position, and so on.

It is often useful to run through a document's nodes, or only the
nodes in a certain range. For that you can either call {@link
Plot.iterate}, or create a resolved position and {@link Pos.walk} that
forward.

### Changes

To modify a Wordgard document you create a {@link ChangeSet change
set} and then {@link ChangeSet.apply applying} that, giving you the
changed document. The new and old document will usually share most of
their inner nodes.

Changes are specified with document positions. {@link
ChangeSet.create} takes a {@link ChangeSet.Spec collection of objects}
that describe the changes (the same format is used when creating
editor transactions).

Assume the document is a paragraph with the word "sage". These are
some possible ways to make changes to it:

```javascript
let delS = ChangeSet.create(doc, {from: 1, to: 2})
let addWord = ChangeSet.create(doc, {
  from: 1,
  insert: [Leaf.text("meadow ")]
})
let replace = ChangeSet.create(doc, {
  from 1, to: 5,
  insert: [Leaf.text("...")]
})
let multiple = ChangeSet.create(doc, [
  {from: 1, insert: [Leaf.text("(")]},
  {from: 5, insert: [Leaf.text(")")]}
])
```

A change spec can be a single change or an array of changes (it may
also contain existing change set objects). Content changes can specify
a start and optional end, and either delete that range, or insert
content by providing an array of tokens to insert at the given
position.

Tokens can be nodes. But sometimes you need to not just insert a whole
node, but end or start a plot at a specific position. For that reason,
tokens may also be plot open tokens, for which plot tag objects are
used, or a special {@link Plot.End} token to close the current plot.
For example, to create a paragraph break in the middle of the example
document, you could do this:

```javascript
let paraBreak = ChangeSet.create(doc, {
  from: 2,
  insert: [Plot.End, Paragraph]
})
```

Where {@link Paragraph} is the plot tag for paragraph nodes. A set of
tokens is called a {@link Slice slice}, which is also the type of
object used for replacements when {@link ChangeSet.iterChanges
iterating} the changes in a set.

When specifying multiple changes at the same time, you do not need to
compensate change positions for the other changes. All positions are
specified in terms of the initial document. So for example the change
that inserted parentheses at positions 1 and 5 will put them around
the entire word, because that word spans 1 to 5 in the original
document.

It is also possible for changes to add or remove marks without
replacing the underlying content. When a change object has an {@link
ChangeSet.Change.add `add`} or {@link ChangeSet.Change.remove
`remove`} property, it is a modifying (rather than replacing) change.

```javascript
let makeStrong = ChangeSet.create(doc, {
  from: 1, to: 5,
  add: Strong
})
```

Where {@link Strong} is a the mark for strong emphasis.

#### Change Correction

It is possible to create changes that would break document structure.
For example, if you try to delete the opening token of a paragraph
without putting anything in its place, that would unbalance the
document's token structure, and thus cannot be applied. Similarly, if
you try to put a node somewhere where it is not allowed, that is an
invalid change. Such changes can be created, but will raise an
exception when applied.

Often, you know that the type of change you're creating is valid. But
when you don't, it is possible to make {@link ChangeSet.create} check
and fix the change for you. There are two ways to do this. The first
is to put a {@link ChangeSet.Change.fit `fit`} property on a specific
change. This gives {@link ChangeSet.create} permission to change the
range of the change, moving it out to cover plot open and close tokens
if that improves the fit, and activates a correction mechanism that
will make sure the document remains valid, by dropping changes or
adding plot open/close tokens when necessary.

It is also possible to _only_ activate the correction feature by
{@link ChangeSet.Spec wrapping} a group of changes in a `{correct:
changes}` object. That will first combine the given changes, and then
make sure the resulting change is valid. If you add a `local: true`
property to the object, the correction strategy will try to keep its
corrections as close to the changes as possible.

### Mapping

Change sets support {@link ChangeSet.mapPos position mapping}, which
adjusts a position in the old document to get the corresponding
position in the new document. This serves an important function in the
system. It, for example, keeps the selection in the right place as the
document changes, and allows other positional data, such as [document
decorations](#h-decorations) to be tracked across changes.

When content is inserted _at_ the mapped position, whether you want
the new position to be before or after that content depends on the
kind of thing you are tracking. As second argument to `mapPos` allows
you to set an associativity for the mapping.

In some cases, you want to consider a position deleted, and stop
tracking it, when some content near it is deleted. The optional third
argument to `mapPos` allows you to provide a tracking mode,
instructing the method to return `null` instead of a new position when
either the element before, the element after, or the elements on both
sides of the position were deleted.

It is also possible to {@link ChangeSet.transform transform} change
sets over each other. If you have two changes A and B that start from
the same document, you can transform B over A to create a version of B
that can be applied to the document created by A.

```javascript
let a = ChangeSet.create(doc, {from: 1, insert: [Leaf.text("a")]})
let b = ChangeSet.create(doc, {from: 5, insert: [Leaf.text("b")]})
// Inserts a 'b' at position 6
let b2 = b.transform(doc, a)
let doc2 = b2.apply(a.apply(doc))
```

It is possible for such a transformation to need to apply its own
corrections, when the changes conflict in a way that would create an
invalid change. If you transform two changes across each other, the
library makes sure to apply the same correction in both, so that, if
you set the second argument (which determines the ordering of
conflicting inserts) to `true` in one and `false` in the other, the
result of applying them both after the other produces the same
document.

There's a shorthand function {@link ChangeSet#transform} to perform
this type of mutual transformation.

```javascript
let {a: a2, b: b2} = ChangeSet.transform(doc, a, b)
assert(b2.apply(a.apply(doc)).eq(a2.apply(b.apply(doc))))
```

This functionality allows simple types of operational transformation.
It is also used when creating change sets or amending transactions to
move changes into the proper document coordinate system, and by the
undo history to combine undoable and non-undoable changes.

</section>

<hr class="floral">

<section>

## The Schema

A {@link Schema document schema} lists a collection of node and mark
types that are allowed to appear in documents confirming to that
schema, and specifies their relations—which nodes may appear in which
plots, and which marks may appear on which tags. The document node
stores a {@link Plot.Doc.schema reference} to the schema, and ensures
that its content conforms to the schema on creation.

This means that your document (and editor) only ever contains content
elements that you explicitly allowed. Wordgard assumes you have a
specific set of constructs you want to allow, and defines your
document in terms of those constructs.

You configure your schema either by adding all its elements to an
editor configuration, and letting the editor state create it, or by
{@link Schema.define constructing} it ahead of time, and {@link
GardState.Spec.doc passing in} a document in that schema when creating
the state.

### Plot Types

The elements that make up the schema are leaf, plot, and mark types.
The `"wordgard/types"` module provides a collection of basic schema
elements, but it is possible to {@link Plot.define define} your own.
For example, this is what a definition for an "aside" plot might look
like:

```javascript
const Aside = Plot.define("Aside", {
  blockContent: Node.Group.Content,
  group: Node.Group.Content,
  shape: {element: "aside"}
})
```

Each node or mark type has a name string (`"Aside"` in this case),
which will be used in the document's JSON-serialized format, and its
`toString` output, which can be useful for debugging. These names must
be unique in a schema.

A plot needs to indicate what content it supports. In this case we
used the {@link Node.Group.Content `Content`} node group, which
indicates generic block-level content. Node groups are tags that can
be attached to nodes—you can see that we assign the same group to our
new plot—as a kind of category. The {@link Plot.Spec.blockContent
`blockContent`} field accepts a {@link Node.Query node query}, which
may be a group, a precise node type or tag, or a union or intersection
of other queries.

Each schema element must define an HTML/DOM {@link Node.Spec.shape
shape}. In this case, we simply want to wrap the plot's content in an
`<aside>` element, which we declare, and which allows the library to
derive both serialization and parsing logic for the plot. When there
are parameters to serialize, and DOM attributes to create and parse,
this needs to be a bit more elaborate. In some cases, you just want to
specify the format {@link Shape.Structure directly}, and hand-write
the {@link Node.Spec.parseRules parse rules} to match the element.

The {@link Plot.define} call above will create a {@link Plot.Tag plot
tag}, not a type. Since this plot type takes no parameter, you'll
generally want to use it as a tag, rather than a type. To make this
convenient, the library allows you to pass in tags in many places
where it accepts types.

For plot types where you _do_ need a parameter, you'd use {@link
Plot.Type.define} instead of {@link Plot.define}, and get plot type as
result. Such type objects have an {@link Plot.Type.of `of` method}
that creates a tag from the type and a parameter.

This is what a plot type defining a speech bubble style with the name
of the character talking in the parameter might look like:

```typescript
const SpeechBubble = Plot.Type.define<string>("SpeechBubble", {
  inlineContent: true,
  group: Node.Group.Content,
  validate: "string",
  defining: true,
  shape: {
    element: "speech-bubble",
    attributes: param => ({"data-character": param}),
    readElement: elt =>
      elt.getAttribute("data-character") ?? parse.Reject
  }
})
```

Even types defined with a parameter can specify a {@link
Node.Spec.defaultParam default parameter} to use when there is no
explicit parameter available. Types defined with a default parameter
or as a singleton have a {@link Plot.Type.default} property with their
default tag.

There's a number of other options available for plot types, such as
{@link Plot.Spec.defining `defining`} used above. I recommend looking
through the reference for {@link Plot.Spec} to learn about them.

### Leaf Types

Leaves are defined in a very similar way. For example, this is how you
might define a dinosaur leaf type:

```javascript
const Dinosaur = Leaf.Type.define<string>("Dinosaur", {
  inline: true,
  validate: "string",
  shape: {
    element: "wordgard-dinosaur",
    attributes: name => ({"data-dino": name}),
    readElement: elt => elt.getAttribute("data-dino")
  },
  selectable: true
})
```

<figure class=float-right style="margin-top: 0"><img src="../../img/tansy.jpg" alt="" style="width: 250px" loading=lazy></figure>

Inline nodes, both plots and leaves, must set the {@link
Node.Spec.inline `inline`} property to true in their definition.

When a type has a parameter, it is recommended to define a {@link
Node.Spec.validate `validate`} property that either specifies the
valid type as a string, or provides a validation function. This helps
the JSON deserializer make sure that it's not creating nodes with
invalid parameters.

Because this leaf has a parameter, the shape defines both a way to
serialize it to an attribute, and a way to read it back from the
element when parsing.

The `selectable` flag tells the library that this leaf can be
selected. Cursoring through it will make the selection pause on the
node, and clicking it will select it.

### Mark Types

Marks are defined in a way very similar to nodes, also providing both
{@link Mark.define} (for on/off things like {@link Strong}) and {@link
Mark.Type.define} (for marks with parameters, like {@link Link}).

A mark shape may be either a wrapping element or an attribute. For
example, {@link Strong} wraps its target node in a `<strong>` element,
whereas {@link ImageAlt} sets its `alt` attribute. Such definitions
look like this:

```javascript
export const Strong = Mark.define("Strong", {
  rank: 60,
  shape: {element: "strong"},
})

export const ImageAlt = Mark.Type.define<string>("ImageAlt", {
  target: [Image, Figure, CaptionedFigure],
  validate: "string",
  shape: {attribute: "alt", value: 0, preferTarget: "img"}
})
```

Each mark can provide a {@link Mark.Spec.rank rank} to influence the
way it is ordered in mark {@link Mark.Set sets} relative to other
marks. This is important for marks that render a wrapping element,
since it determines the nesting order of the elements when a single
node has multiple such marks.

An {@link Shape.Attribute attribute shape} that just stores the
parameter in the attribute as-is can indicate this with `value: 0`.
When a more involved transormation is necessary, it is again possible
to define custom functions to create and parse the attribute.

It is possible, in an attribute shape, to indicate a preferred target.
In the `ImageAlt` case, figures wrap the image in a `<figure>`
element, and images might also be configured to render additional
wrappers. But the `alt` attribute is meaningless when not on the
`<img>` element, so we need to target that, rather than the node's
outer element.

Another important property of a mark type is whether it is {@link
Mark.Spec.spanning spanning}. Some types of marks, such as image alt
text, refer to a specific node, and have nothing to do with the nodes
around that. Others, like strong emphasis, conceptually apply to a
stretch of content. When adjacent nodes all have the {@link Strong}
mark, the `<strong>` element should wrap them all, rather than each
individually. Text nodes can only have spanning marks, because they
are not really individual nodes in the sense of other nodes, but
rather stretches of characters that happen to be grouped because they
are adjacent to each other.

The definitions above don't have to explicitly set `spanning` because
it defaults to true for marks defined with an element shape, and false
for those with an attribute shape. But if you want to define a
non-spanning node with a wrapping attribute, you'll need to explicitly
set it.

There's some further fields in {@link Mark.Spec} that can configure a
mark's behavior. You can take a look whether they are useful for the
mark you're defining.

### Schema Overrides

Plots types define their own content, and mark types define what nodes
they apply to. But since these attributes are about the way the
elements in a schema fit together, a specific schema may need to
adjust them. That's what {@link Schema.Override schema overrides}, the
last remaining type of schema element, are for.

You can use {@link Schema.Override.plotContent} to replace the content
query for a given plot, {@link Schema.Override.markTarget} to
configure what nodes a mark applies to, and {@link
Schema.Override.nodeGroup} to change the set of groups a node belongs
to. Including the resulting objects in a schema configuration applies
them to that schema.

Such overrides are the reason that methods like {@link
Schema.matchNode}, {@link Schema.markAllowed}, and {@link
Schema.canContain}, which query these relations, exist on the schema,
rather than the node or mark type.

</section>

<hr class="floral">

<section>

## Editor State

The {@link GardState} class from `"wordgard/state"` implements the
object that holds the editor's state. Such objects are again
immutable, so a given state won't change, and you can compare a
previous state to a new state to see whether some aspect of it was
updated.

The main things the state tracks are the current {@link GardState.doc
document}, the {@link GardState.selection selection}, and the editor
{@link GardState.config configuration}. An editor has a {@link
Wordgard.state current state} that you access to get at these fields.

Creating an editor state can be done with {@link GardState.create}.
You provide it a starting document, an optional initial selection,
and a configuration, and it gives you a state. If the configuration
defines a schema, the document may be an HTML string or a piece of DOM
structure. If not, you have to pass in a document plot in order to
provide your schema.

```javascript
let state = GardState.create({
  doc: `<h1>Hi!</h1>`,
  config: basicSchema()
})
```

To "reset" an editor state, for example when loading a new document
into your editor, you'll want to create a completely fresh state,
rather than trying to update your old state to the new document.

### Transactions

Updating the state is done by creating a {@link Transaction
transaction}, either via {@link GardState.update `state.update`} or by
directly calling {@link Wordgard.dispatch} on an editor. Such a
transaction describes precisely what needs to be updated, and is made
available to any code that observes or handles editor changes, so that
such code has all the information it needs about the change.

The things stored in a selection are:

 - A set of {@link Transaction.changes document changes}. Will hold
   the empty set if the transaction makes no change.

 - An optional explicitly set {@link Transaction.selection selection}.
   If the selection isn't set, this holds null. {@link
   Transaction.newSelection} will always hold the selection after the
   transaction, whether explicitly set or mapped from the existing
   selection.

 - A set of {@link Transaction.annotation annotations}, which are
   metadata that can be attached to a transaction. Will include the
   {@link Transaction.time time} at which the selection was created,
   and often a {@link Transaction#userEvent user event tag}.

 - A set of custom {@link Transaction.effects effects}, which are
   user-definable values that describe some additional effect the
   transaction has, such as scrolling something into view, or opening
   a dialog.

The new state created by the transaction is available in its {@link
Transaction.state `state` property}.

Transactions are created with a {@link Transaction.Spec} object, which
allows you to provide these fields in a straighforward object literal.

```javascript
let tr = state.update({
  changes: {from: 10, insert: Image.of("bee.jpg")},
  selection: {anchor: 11},
  userEvent: "insert.bee",
  scrollIntoView: true
})
```

The `scrollIntoView` field sets a flag on the transaction, telling the
editor to scroll the cursor into view after the transaction has been
dispatched. Most (but not all) editing actions will want to set it.

It is possible to register extensions that affect all transactions. A
{@link Transaction.extender transaction extender} can change
individual transactions, which can be useful for adding metadata (like
{@link Transaction.Annotation annotations} or {@link
Transaction.Effect effects}) or [fixing up](#h-corrections) undesired
document shapes. {@link Transaction.appender Transaction appenders}
can inject additional transactions after a given transaction is
dispatched.

### Selection

A Wordgard selection is an object that inherits from {@link
GardSelection}. The `"wordgard/state"` module defines two types of
selections, and other code can {@link GardSelection.define define}
custom types.

Each selection has an {@link GardSelection.anchor anchor} (the
position at which its fixed point sits) and a {@link
GardSelection.head head} (the position of its movable side). The two
may be the same, for a cursor selection. There's also {@link
GardSelection.from}/{@link GardSelection.to} properties to directly get the
lower or upper bound.

{@link GardSelection.Text Text selections} are the selection type used
for plain old selections. They may optionally store a set of marks to
apply to content inserted through that selection (which is used when
you, for example, toggle the emphasis mark while no text is selected).

Selection positions can be any point in the document, including
between blocks. Selections created by the library, whether for
keyboard cursor motion or pointer events or in response to changes,
tend to be 'normal' cursor selections, which are a subset of the
document positions, and include block positions only where they are
necessary to make some types of editing possible. See the {@link
GardSelection.nextNormalCursor} method.

{@link GardSelection.Node Node selections} select a single {@link
Leaf.Spec.selectable selectable} leaf node. They have a {@link
GardSelection.Node.node} property that holds the node.

As an example of a custom selection the tables module defines a {@link
CellSelection cell selection} type that covers a rectangle of table
cells.

The editor state has a {@link GardState.sel} property that, for
convenience, holds a {@link GardSelection.Resolved _resolved_} version
of the selection, whose {@link GardSelection.Resolved.anchor}/{@link
GardSelection.Resolved.head}/{@link
GardSelection.Resolved.from}/{@link GardSelection.Resolved.to}
properties give you {@link Pos resolved positions}.

</section>

<hr class="floral">

<section>

## Configuration

The `"wordgard/state"` module defines a versatile set of configuration
primitives.

The {@link GardState.Spec.config `config` field} provided when
creating a state has the type {@link GardState.Extension}, which is
defined in the following, somewhat mysterious way:

```typescript
type Extension = {extension: Extension} | Extension[]
```

The way to read this is that the library defines some built-in types
that count as extensions, via the object type, and an extension is a
single such predefined extension, a custom object with an extension in
its `extension` field, or a tree of arrays of extension values.

Being able to provide an `extension` property on an object type is
used throughout the system to make it possible to use things like
{@link KeyBinding key bindings} and {@link InputRule input rules}
directly in an editor configuration.

Since extensions often need a relative precedence to determine who
gets to override who, a configuration defines a full ordering of
extensions based on the position they had in the input extension tree,
plus their explicit precedence.

Explicit precedence is assigned by the functions in {@link
GardState.prec}. Any extensions wrapped in a precedence get assigned
to that precedence, unless they override it with their own custom
precedence. In the final ordering, explicit precedence comes first,
and within a given explicit precedence, the order in the extension
tree determines relative precedence.

So if you have three {@link KeyBinding key bindings} for `Ctrl-b` in
your configuration tree, with the last one assigned to {@link
GardState.prec.high `prec.high`}, that last one will get asked to
handle the key first, and if it declines, the other two are used in
order of appearance.

Extension modules often export their functionality as a
function—optionally taking some configuration object—which returns an
extension bundle that implements the functionality. Depending on the
type of extension and how well they can be used separately, it may
also be worthwhile to export the individual pieces separately, in case
the user wants to pick and match the precise extensions they need.

### Facets

Because user code will often need the same primitives that library
code uses, Wordgard exposes ways to define your own extension points.

Such extension points are called {@link GardState.Facet facets}, and
are also feature heavily in the library's own interface. They are
object that name the extension point, specify its type, allow code to
{@link GardState.Facet.of provide} input values, and make it possible
to {@link GardState.facet read} the current value of the facet from a
state.

A {@link GardState.Facet facet} has two type parameters: an input type
and an output type, where the output type defaults to an array of the
input type. When defining the facet you can provide your own {@link
GardState.Facet.Spec.combine `combine` function} that takes an array
of inputs and computes an output value. A common pattern for
single-valued facets is to just take the highest-precedence input or,
if there are no inputs, a default value. Another useful pattern is to
have the function {@link GardState.Facet.combineConfig combine} a set
of configuration objects into a single combined configuration.

Often facets only have static inputs, provided directly in the
configuration, and their output value is stable for a given
configuration. Such facets outputs are computed once, and kept for the
lifetime of the configuration. They occur no overhead during state
updates.

But it is also possible to {@link GardState.Facet.compute define}
dynamic inputs that depend on some other aspect of the state. Facets
with such inputs are recomputed whenever one of their inputs changes
(using a [signal](https://docs.solidjs.com/concepts/signals)-like
mechanism for dependency tracking), but stay the same otherwise.

The library tries to keep facet output values stable as much as it
can, using {@link GardState.Facet.Spec.compare comparison functions}
to determine when outputs or inputs don't change. If a new output
compares equal to the old one, the old one is kept, so it is generally
safe to compare facet outputs by object identity.

Examples of facets are simple configuration options like {@link
GardState#readOnly}, which determines whether an editor state is
read-only, collections like the facet that hold {@link
KeyBinding.source key bindings}, and control facets like {@link
Panel.show} and {@link Decoration.Point.source} that determine what
kind of UI elements are visible in the editor.

### State Fields

Extensions may also define {@link GardState.Field state fields}. Like
dynamic facets, these live in any state for which they are configured,
and are updated as the state changes. Unlike facets, their update
happens with a reducer-like {@link GardState.Field.Spec.update
function}, which is called with the field's old value and the
transaction on every update, and may opt to return the old value or a
changed value depending on the transaction.

Like anything that lives in the editor state, field content should be
immutable.

Fields are best used for persistent pieces of state. Examples of state
fields are the history tracked by the {@link history undo/redo}
system, sets of document {@link Decoration decorations} that need to
persist across changes (you'll store them in a {@link PointSet point}
or {@link RangeSet range} set and map them through changes), or
information like whether a given panel is currently open.

It is often useful to define {@link Transaction.Effect state effects}
to communicate from your transaction-dispatching code to your state
field update function.

Facets provide a {@link GardState.Facet.from convenience method} for
registering a dynamic facet that uses a field's value.

### Dynamic Configuration

While it is entirely possible for an editor configuration to be set at
the time where the editor is initialized and stay the same forever
after, you sometimes want to change your configuration without
throwing away your editor state. For example to load additional
extensions or to disable some feature.

There are three ways this can be done. {@link GardState.reconfigure}
is an effect type that will replace your entire configuration with a
new one. Then, {@link GardState.appendConfig} is an effect that will
add additional extensions at the end of your old configuration. This
can be useful for extensions that need to "inject" some configuration
when they are first activated. And finally, for fine-grained
reconfiguration, you use {@link GardState.Compartment compartments}.

A compartment {@link GardState.Compartment.of tags} part of your
initial configuration, and provides a way to replace exactly that
part. It may start empty, or later be emptied to remove some
extensions.

The way you use these is that you first {@link
GardState.Compartment.define define} your own compartment, and include
that, with some extension in it, in your configuration using {@link
GardState.Compartment.of `compartment.of`}`(...)`. You can then
dispatch a transaction with the effect created by {@link
GardState.Compartment.reconfigure `compartment.reconfigure`}`(...)` to
reconfigure your compartment.

When a configuration change changes the document schema, the library
will try to apply the new schema to the old document. You have to make
sure this is possible (the document contains no nodes or structure
that isn't valid in the new schema), or the library will raise an
{@link ValidationError exception}.

</section>

<hr class="floral">

<section>

## Editor Component

All those foundations now finally allows us to get to the actual
editor. The {@link Wordgard} class from `"wordgard/editor"` is
responsible for rendering the document as a piece of editable browser
DOM, wiring up browser editing events to editing actions, and handling
editor state updates.

You create an editor with the {@link Wordgard.create} function. It
takes a few configuration parameters—such as an optional {@link
Wordgard.Spec.parent parent element} to append the editor to, and an
editor state. For convenience, it is allowed to inline the options to
{@link GardState.create} directly into the object passed to {@link
Wordgard.create}, and it will create the state for you.

```javascript
const editor = Wordgard.create({
  doc: `<p>Let's go</p>`,
  config: [basicSchema(), history()],
  parent: document.body
})
```

It is never a good idea to directly manipulate the editable content.
If you need to change the document, go through the transaction system.
If you want to display something in the document, use the
[decoration](#h-decorations) system.

### Updates

The most important method on a Wordgard editor is {@link
Wordgard.dispatch}. You pass it a transaction or {@link
Transaction.Spec transaction spec}, and it will apply that transaction
to its state and then update itself to reflect the new state.

Updates are only partially synchronous. The {@link Wordgard.state
`state` property} will immediately reflect the updated state. But the
actual DOM representation of the editor is only updated on the next
"flush", which is scheduled with
[`requestAnimationFrame`](https://developer.mozilla.org/en-US/docs/Web/API/Window/requestAnimationFrame)
(and only if the editor is actually in the document). So a bunch of
rapid-fire transactions will not cause a sequence of unnecessary full
updates, but rather will be batched and processed together at the next
flush.

Regardless of this optimization, try to dispatch a single coherent
transaction, rather than a bunch of separate ones, whenever possible.

There is a {@link Wordgard.updateListener `updateListener` hook} that
is called after every update, which can be useful to have imperative
code listen in on editor activity.

### Plugins

Editor {@link Wordgard.Plugin plugins} allow you to put a stateful
object in the editor component, and have it get notified whenever the
editor updates. This is mostly useful for implementing extensions that
need to integrate closely with the DOM—for example, the built-in
tooltip and panel features are built with editor plugins.

You can use {@link Wordgard.Plugin.define} (or {@link
Wordgard.Plugin.fromClass}) to define a plugin. When the editor state
has such a plugin in its configuration, the plugin is initialized on
editor creation and notified of anything that happens in the editor.

Its {@link Wordgard.Plugin.Value.update `update`} method will be
called when the editor is flushed, right before the editor updates its
document. This is the point where the plugin may update any DOM
structure it manages.

To avoid layout trashing (the thing where the browser needs to compute
its document layout again and again because code alternates between
reading layout information and modifying the DOM), plugins that need
access to the document layout to update themselves should use the
{@link Wordgard.scheduleDOMRead} and {@link Wordgard.scheduleDOMWrite}
methods.

A plugin update that, for example, needs to measure the size of a
tooltip should call `scheduleDOMRead` to do the reading, and if it
concludes that it needs to make more changes to the DOM, call
`scheduleDOMWrite` from there to do that. When scheduled during a
flush, scheduled reads and writes will be immediately handled by the
current flush, but grouped by access type, to minimize the amount DOM
layout computations.

### DOM Queries

A {@link Wordgard} instance provides a number of methods for querying
DOM structure and layout. You can find out which document node
corresponds to a given DOM element with {@link Wordgard.nodeFromDOM},
or go the other way with {@link Wordgard.nodeDOM}.

Again, though you can look DOM structure, that is only intended for
doing things like getting its client rectangles or comparing it to
some other element, not for manipulating the document.

You can find out where on the screen a given position is with {@link
Wordgard.coordsAtPos}, and figure out which position is under a set of
coordinates with {@link Wordgard.posAtCoords}. {@link
Wordgard.coordsForElement} gives you the rectangle where the node or
character at the given position is displayed.

To compute layout-dependent cursor motion, there is a {@link
Wordgard.moveVertically} method, that takes a selection and moves it
up or down. {@link Wordgard.moveToLineBoundary} tells you where the
line that a given selection is in starts or ends.

All such methods that require access to the DOM will force a flush
when they are called at a time where the editor isn't flushed. This is
generally not an issue, but it is something to keep in mind.

### Styling

Wordgard uses a CSS-in-JS system to manage CSS rules. It is also
possible to style it with regular style sheets, but because both the
core editor and extensions need to be able to bundle their styles and
have them loaded automatically on demand in the right root without
burdening the user, the easiest way to define them is in your scripts.

To define a set of styles for your extension, you use {@link
Wordgard.styles}, which returns an extension that causes the rules to
be loaded.

```javascript
const myStyles = Wordgard.styles({
  ".my-button": { borderRadius: "5px" },
  "&dark .my-button": { color: "white" },
  "&light .my-button": { color: "black" }
})
```

The properties of the object passed to this function are selectors,
and the properties of the nested objects are CSS properties (with
support for camel-case). See the [styling
example](../../examples/style/) for a more detailed description of the
notation. You can use the `&dark`/`&light` selectors to define rules
that should only apply with a dark or light color scheme. These will
be replaced by generated class names that are present on the editor's
outer element when using that color scheme.

Rules without `&dark` or `&light` selectors get prefixed with another
generated class, to make sure they don't leak out of the editor. If
you need to refer directly to the editor's outer element (which is the
element that will have this class), you should use `&` in your
selector to refer to it, so that the added class selector ends up in
the right place.

A similar function {@link Wordgard.theme} exists to define a set of
styles that can optionally be added to a specific editor. Contrary to
{@link Wordgard.styles plain styles} which all share a scope class,
regular themes get their own scope class, so that the rules they
define won't affect editors in which they are not active.

The editor's structure looks something like this:

```html
<wordgard-editor class="ͼ1 ͼ2">
  <wg-panels class="wg-panels-top">
    <wg-menubar role="toolbar" class="wg-panel">
      <!-- menu stuff -->
    </wg-menubar>
  </wg-panels>
  <wg-scroller>
    <wg-content contenteditable="true" role="textbox">
      <p><!-- document content--></p>
    </wg-content>
    <wg-cursor-layer>
      <wg-cursor class="wg-cursor-v"></wg-cursor>
    </wg-cursor-layer>
  </wg-scroller>
</wordgard-editor>
```

The editor has a wrapper element, which holds the generated prefix
classes. It is a column-direction flexbox that extensions can add
elements to. In the example above, the {@link menuBar menu bar} added
itself, via the {@link Panel panel system}, to the top of the editor.

Then there's a scroller element. By default this doesn't actually
scroll, but it's what you can target with styles setting a height and
overflow if you want your editor to {@link Wordgard.scrolling scroll}.

Inside of that you have the actual editable element with the rendered
document. Because the editor draws its own cursor, the document is
overlaid by a `<cursor-layer>` element into which that cursor is
positioned.

<figure class=float-right style="margin-top: 0"><img src="../../img/beetle.jpg" alt="" style="width: 220px" loading=lazy></figure>

### Decorations

Wordgard provides several ways for extensions to influence the way the
document gets drawn. These are called “decorations”—they decorate the
rendered document, without changing the document data structure
itself.

The simplest form of decorations are “tag” decorations, which target a
specific node type, replacing its {@link Decoration.Tag.shape shape},
{@link Decoration.Tag.wrapper wrapping} it in additional elements, or
drawing {@link Decoration.Tag.widget widgets} next to it or at its
start or end. These work as extensions that, when present in an
editor's configuration, affect all nodes of the targeted type.

In situations where you just want to modify selected nodes or ranges
of content, you have to use a {@link PointSet point} or {@link
RangeSet range set} that places your decorations at a specific part of
the document.

These data structures associate a specific type of decoration ({@link
Decoration.Point point} or {@link Decoration.Range range} decorations)
with a position or range in the document. You define an extension that
provides them to the editor component via a {@link
Decoration.Point.source source facet}, which causes the editor to use
them when drawing the document.

```javascript
let blueNode = Decoration.Point.attributes({
  style: "background: lightblue"
})
let source = Decoration.Point.source.of(state =>
  PointSet.create([[0, blueNode]]))
```

That decoration turns the node at the start of the document blue. Of
course, a set that targets a static position in a changing document is
generally not of much use, so you'll usually want to store these sets
in a {@link GardState.Field state field} and use their {@link
PointSet.map `map` method} to make them move along with document
changes in the field's `update` function. For small, cheap-to-compute
sets of decorations, it can also be workable to just generate them
every time the source function is called.

{@link Decoration.Point Point decorations} can, apart from adding
attributes, place {@link Decoration.Point.widget widgets} in the
document, override the {@link Decoration.Point.shape shape} of a
specific node, or {@link Decoration.Point.wrapper wrap} it.

{@link Decoration.Range Range decoration} can add an {@link
Decoration.Range.attribute attribute} or {@link
Decoration.Range.wrapper wrapper} a number of nodes in a range. Like
spanning marks, such wrappers may {@link
Decoration.Range.WrapperSpec.spanning span} multiple nodes.

</section>

<hr class="floral">

<section>

## Commands

When the editor component captures a
[`beforeinput`](https://developer.mozilla.org/en-US/docs/Web/API/Element/beforeinput_event)
event with an input type of `"insertLineBreak"`, it will dispatch the
{@link insertLineBreak} command. Many other native editing actions
also correspond to commands defined in
[`"wordgard/command"`](../ref/#command).

Commands are also used in {@link KeyBinding key bindings} and {@link
Menu.Button menu buttons} to specify the action to take for the key or
button. Extension modules that define additional editing functionality
will often export their own commands that implement user actions
related to that functionality.

A command is a {@link Command function} that takes an editor and a
parameter, and either performs the command as a side effect, returns
it as a {@link Transaction.Spec transaction spec}, or returns `false`
to indicate that it doesn't apply to the current editor state.

Though commands are just functions, they also function as tags that
identify some generic editing action. Extensions can provide
additional {@link Command.handler handlers} for a given command, which
will be run (in order of precedence) when the command is invoked with
{@link Command.dispatch}. This makes it possible to override a given
editing command, either in general or in specific situations, by
configuring your own custom handler.

For example, this handler overrides the {@link enter} command
(dispatched when enter is pressed) to, when in a paragraph with the
text "Abracadabra", to change the word to "Alakazam" instead of
splitting the paragraph.

```javascript
const magicEnter = Command.handler(enter, wg => {
  let block = wg.state.sel.head.textblockParent
  if (!block || block.node.textContent() != "Abracadabra")
    return false
  return {
    changes: {from: block.start, to: block.end,
              insert: [Leaf.text("Alakazam")]},
    scrollIntoView: true
  }
})
```

A command that takes a parameter can be {@link Command.bind bound},
producing an object that can, just like a parameter-less command, be
passed to {@link Command.dispatch} to run the command with that
parameter.

</section>

<hr class="floral">

<section>

## Corrections

The way permitted plot content can be described in Wordgard is rather
simple—you provide a {@link Plot.Spec.blockContent set of allowed
nodes} and say whether the plot {@link Plot.Spec.canBeEmpty may be
empty}. Those constraints are enforced on plot creation and change
application.

But sometimes you want to enforce more complicated invariants, such as
that tables must be rectangular (each row has the same number of
columns) or that sections must start with a heading. Wordgard
intentionally does not try to solve this at the content model level,
because experience with [ProseMirror](https://prosemirror.net) has
shown that...

 - writing document manipulation code in a way that never violates
   complicated schema constraints is very hard.

 - such constraints often get in the way of multi-step editing actions
   that the user is trying to perform, by disallowing the intermediate
   document shape.

 - the automatic enforcing of such constraints can produce unexpected
   and undesired document shapes.

For these reasons, Wordgard intentionally defines a simpler, looser
document model. In cases where you do want to enforce addititional
constraints, {@link Correction corrections} are the abstraction to
support this. They allow you to register observer functions that look
at nodes of a given type every time they change or are introduced, and
optionally return an extension to the transaction to "fix" the node.

Custom fixing code can usually be smart about respecting the thing the
user may be trying to do, to avoid being destructive or surprising
about it—though for some types of constraints this does require some
care.

This is an example of a constraint that makes sure the first block in
the document is a level 1 heading:

```javascript
let ensureHeading = Correction.onChildList(Doc, ({node}) => {
  let first = node.content[0].tag
  if (first.is(Heading) && first.param == 1) return null
  return {from: 0, insert: [Heading.of(1).create()]}
})
```

Such a correction will run whenever the child list of the {@link Doc}
node changes. There's also {@link Correction.onContent}, which will
run even if some content deep inside the node changes, and {@link
Correction.onMarks}, which responds to mark set changes.

If you aren't sure that your starting document conforms to your
corrections, you can run a correction globally with its {@link
Correction.scan `scan` method}. This returns a transaction when it
finds any necessary changes.

</section>

<hr class="floral">

<section>

## Menu System

You'll often want to display some kind of buttons on an editor to
provide the user an obvious way to perform the editing actions that
the system supports.

Extensions may contribute their own menu items. So it is practical to
allow them to automatically insert menu content, without further
configuration work. But in some situations, you want to control
precisely what appears in the menu. Wordgard's menu system tries to
bridge this tension.

Another question is how the menu items should be rendered. Some setups
will want their own custom display, integrated with the UI framework
they are using. Others are happy to use the built-in system. The
Wordgard menu definition system tries to support both.

### Items

The menu model is made up of menu {@link Menu.Item items}, which can
be individual buttons or structuring elements like submenus or named
groups of items. Each item can declare a default parent. These items
can be added to a configuration, where they'll add themselves to the
{@link Menu.Item.source} facet.

When {@link Menu.resolve resolving} your menu structure, you can
either just take whatever items are available in the {@link
Menu.Group.top `top`} group, or provide your own {@link
Menu.Template}, which either specifies the entire structure
explicitly, or leaves some of the inner structure open to be
constructed by resolving parent links.

A menu button, at the minimum, defines what it {@link
Menu.Button.Spec.label looks like}, what it {@link
Menu.Button.Spec.run does}, and where it belongs. This very useless
button pops up an alert when you press it:

```javascript
const myButton = Menu.Button.define({
  label: "Press Me",
  run: wg => { alert("!!"); return true },
  parent: Menu.Group.commands,
  rank: 99
})
```

The {@link Menu.Group.commands `commands` group} is a top-level item
group that also holds things like the undo/redo buttons. An item's
{@link Menu.Item.Spec.rank rank} determines where it sits relative to
other items in the same group.

Most buttons, at least at the top level, use an icon {@link Menu.Label
label} instead of a text string. These are defined using SVG
[path](https://developer.mozilla.org/en-US/docs/Web/SVG/Reference/Attribute/d)
strings, scaled to fit within a 100-by-100 picture. When using a
textual label, it is recommended to use a {@link PhraseSet.Ref
translatable phrase}. When using an icon, you'll want to also define a
{@link Menu.Item.Spec.description textual description}, so that the
button is screen-reader accessible.

Submenus are defined in a way similar to buttons, but instead of
providing a `run` function, they act as a parent to some other items
(possibly further submenus), and pop up this list of inner items when
they are clicked or activated.

Both buttons and submenus can choose to {@link Menu.Item.Spec.select
hide} or {@link Menu.Item.Spec.enable disable} themselves by providing
a function that determines the item's status from the editor state.
Buttons can also be {@link Menu.Button.Spec.active “active”}, which
highlights them. This is used by, for example, inline mark buttons
whose mark is active at the cursor position.

A submenu that doesn't provide its own label can display its first
active child as its label, which can make it act like a drop-down
menu.

{@link Menu.Group Menu groups} just group a set of items, and make it
easier to organize bigger menus (like the top-level menu) or factor
out some parts into a smaller menu (such as a selection tooltip menu).
The library defines a few: the {@link Menu.Group.top top-level menu},
a {@link Menu.Group.commands commands group} for generic commands,
{@link Menu.Group.inline inline} and {@link Menu.Group.block block}
groups for inline-level and block-level document manipulation, and an
{@link Menu.Group.insert insert group} for buttons that insert various
types of nodes.

Finally, {@link Menu.CustomControl custom controls} are a special kind
of button-like item that defers the way it looks (and responds to key
input) to custom code. It can be useful for including elements in the
menu that are a bit more complex than a plain button, such as for
example a color picker.

So when adding a menu to your editor, for example with {@link
menuBar}, you can either just let it default to using the top group
and assembling a menu from all the items in the configuration, or
explicitly create a template by calling the `template` method on
groups and submenus. This simple menu just shows the undo buttons and
the block style dropdown containing whatever items the menu {@link
Menu.resolve resolver} finds for it.

```javascript
import {Menu} from "wordgard/command"
import {undoButton, redoButton} from "wordgard/history"

const myMenu = Menu.Group.top.template(
  undoButton,
  redoButton,
  Menu.Submenu.textblockStyle.template("..."))
```

In a menu template, the `"..."` marker tells the resolver to put any
items for that group of submenu that it finds in place of the marker.
Items that are specified explicitly in the template will not be
included again in this way. This kind of partial template allows you
to control the rough shape of a menu without explicitly listing every
single item.

### Implementation

The {@link menuBar} extension from `"wordgard/editor"` implements a
straightforward, framework-less, keyboard accessible menu bar,
displayed as a {@link Panel panel} at the top of the editor.

A custom menu, in order to be able to use the menu information
provided by existing editor extensions, would use the same items, but
display them in its own way (maybe in a tooltip, maybe as a React
component, whatever fits your situation). It should take an optional
menu template, and {@link Menu.resolve resolve} that with the items
available via the {@link Menu.Item.source menu item source} facet.

When implementing your own menu, take care to make it accessible to
keyboard-only and screen-reader users.

</section>
