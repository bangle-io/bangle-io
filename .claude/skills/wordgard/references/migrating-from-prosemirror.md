!{"type": "docs", "title": "Wordgard from ProseMirror", "deriveTOC": true}

# Migrating from ProseMirror

Wordgard is another iteration on the design of
[ProseMirror](https://prosemirror.net). It uses a lot of the same
ideas, but often in a somewhat different way. This document provides a
summary of the changes, to help people used to ProseMirror get
started.

This system was not in any way designed to provide a compatible
interface. The naming and library structure have been designed from
scratch, so any code that interacts with ProseMirror would have to be
rewritten to work with Wordgard. But a lot of the underlying concepts
are the same, so often the same solutions will still apply, and you
can get away with just adapting what you have to Wordgard's interface.

Wordgard's core is distributed as a single package (`wordgard`), but
does consist of multiple separate modules, which are imported as, for
example `"wordgard/state"`. The mapping between the modules is roughly
this:

 - **`wordgard/doc`**: `prosemirror-model`, `prosemirror-transform`
 - **`wordgard/state`**: `prosemirror-state`
 - **`wordgard/history`**: `prosemirror-history`
 - **`wordgard/command`**: `prosemirror-commands`
 - **`wordgard/types`**: `prosemirror-schema-basic`, `prosemirror-schema-list`
 - **`wordgard/schema`**: ready-made extensions for schema elements
 - **`wordgard/collab`**: `prosemirror-collab`
 - **`wordgard/editor`**: `prosemirror-view`, `prosemirror-menu`,
   `prosemirror-keymap`, `prosemirror-inputrules`

<hr class=floral>

<section>

## Document Model

Wordgard's document model resembles ProseMirror's in basic structure.
You still define nodes and marks, and the way they can nest, and the
document is still a tree of nodes, each with a set of marks.

Wordgard introduces the term _{@link Plot plot}_ (for non-leaf nodes),
and more strictly separates those from _{@link Leaf leaves}_ (nodes
that cannot have content). It also has the concept of a _{@link
Node.Tag tag}_, which is either a full leaf node or the `{type,
parameter, marks}` part of a plot. A plot object itself holds a {@link
Plot.Tag tag} and a content array. A node's {@link Plot.content
content} is direclty exposed as an array, and no longer requires going
through accessor methods.

There are three fundamental changes to the way document structure
works:

 - Content expressions no longer exist. You can only provide a set of
   valid content node types, plus, for block-content plots, whether
   the plot may be empty or not. Any further restrictions on
   parent-child relations need to be handled above the document level,
   for example in a {@link Correction}.

 - Whether marks may appear on a node is no longer controlled by the
   parent node, but by the mark itself.

 - Instead of multiple attributes, nodes now have a single parameter
   value. Optional attributes are modeled with marks.

### Positions

The document indexing system works the same as in ProseMirror. Nodes
now have a {@link Node.Shared.length `length`} rather than `size`
property indicating their total token count.

Resolved document positions are represented with the {@link Pos}
class, with a separate but similar class for {@link Pos.Node node
positions}. Their interface is similar, if a little less confusing, to
ProseMirror `ResolvedPos` objects.

{@link GardSelection Selection} objects store raw positions instead of
resolved positions as they did in ProseMirror, but the state does
allow easy access to resolved selection bounds via its {@link
GardState.sel `sel` property}.

### Schema Structure

Wordgard schemas are less monolithic than ProseMirror ones. A node or
mark type exists outside of a schema, and can be shared between
schemas. Because extra attributes are modeled with marks, you can
define them for node types without modifying the node type itself.

A specific schema can {@link Schema.Override modify} the relationships
between nodes and marks without redefining the node or mark itself.
The effect is that these schema elements can be reused across schemas
much easier, and it is more convenient to compose a schema out of
existing node or mark implementations than it is in ProseMirror.

The less complicated constraints on parent-child relations also mean
that it is easier to write document-manipulating code that works on
any schema, which is a very tricky exercise in ProseMirror.

Node declarations try to be a little more declarative, by combining
the serialization and parsing information in a single field, for
simple nodes. Such a declaration returns a node type (or, if the type
has no parameter, a tag), which can be used as part of a schema.

```javascript
const CodeBlock = Plot.define("CodeBlock", {
  inlineContent: true,
  group: Node.Group.Content,
  role: Node.Role.Code,
  shape: {element: "pre"}
})
```

Each type still has a string name that's used for JSON serialization
and debug output, but plays less of a role in the API than it does in
ProseMirror. You'll usually refer to node types via their object,
rather than their string name.

</section>

<hr class=floral>

<section>

## Configuration

Wordgard inherits [CodeMirror](https://codemirror.net)'s extension
system, based on {@link GardState.Facet facets} almost completely
unchanged. This means that instead of a limited set of editor and
plugin props, extension points are now a first-class thing, and new
ones can be defined in a couple of lines, both inside the library and
in your own code.

Because facet-style configuration makes it easy to define extension
points in such a way that extensions compose, and the {@link
GardState.prec precedence} system allows control over extension
precedence where needed, configuring an editor by dropping in
different packaged extensions is a lot easier in this system.

An editor configuration is a tree of extensions which, unlike
ProseMirror's flat array of plugins, allows a given extension bundle
to include any number of sub-extensions, which are a finer-grained
thing than ProseMirror plugins. Plugin state is now modeled with
{@link GardState.Field state fields}, {@link Wordgard.Plugin view
plugins} exist as their own thing, and props, replaced by facets, no
longer need to be attached to a plugin to be declared.

Schema construction is done at configuration time by combining the
{@link GardState.schemaElement schema elements} found in the
configuration. This means that it is often possible to just drop in,
say, a {@link orderedList list} extension in order to have list
support in your schema.

Other supporting extensions, such as {@link Menu.Item menu item}
definitions or key bindings, can be included in the same extension
bundle. In general, configuring Wordgard should be a lot less finicky
than configuring ProseMirror, especially in cases where you're not
changing many defaults.

A drop-in {@link menuBar menu implementation} is part of the core
Wordgard library.

</section>

<hr class=floral>

<section>

## Transactions and Changes

Wordgard's model of document changes is completely different from
ProseMirror's step model. Transactions creation also works very
differently, again inspired more by CodeMirror than by ProseMirror.

### Changes

A Wordgard document change represents a single pass over the document,
replacing some ranges and keeping others intact, optionally adding or
removing marks to the preserved ranges. It is stored in a 'delta'
format, as a sequence of sections that cover the old document.

Such change sets can be composed or transformed over each other. They
are a lot easier to manipulate and inspect than sequences of
ProseMirror steps were.

Position mapping works similar, except that mappings and changes are
not separate, but represented by the same {@link ChangeSet object}.
Change sets have a {@link ChangeSet.mapPos} method that transforms a
position before change to a position after the change.

When composing changes, for example to build up a transaction, all the
separate changes are specified in the original document's index
system. So there is no need, as there is in ProseMirror, to adjust for
the offsets produced by the other changes. Conceptually, they all
happen at once.

### Slices

Slices in ProseMirror are sequences of nodes, which may be partial
nodes, along with an open depth at the start and end of the slice. In
Wordgard, where changes are modeled in terms of replaced tokens (which
can be the start of a plot, end of a plot, leaf node, or text
character), a {@link Slice slice} is a sequence of tokens. This uses
nodes (leaf or non-leaf) to stand for themselves, plot {@link Plot.Tag
tags} to stand for opening tokens, and a {@link Plot.End special
value} for plot end tokens.

The array passed in the {@link ChangeSet.Change.insert `insert`}
property of a change spec is an array of tokens.

### Transactions

ProseMirror transactions are mutable objects that use method chaining
to accumulate the aspects that make up the transaction. Wordgard uses
immutable objects created from a {@link Transaction.Spec spec object}
instead.

```javascript
wg.dispatch({
  changes: [
    {from: 1, insert: [someNode]},
    {from: 8, to: 10, add: Strong},
    {from: 20, to: 30}
  ],
  selection: {anchor: 2},
  scrollIntoView: true
})
```

Transactions still are objects that describe the entire change to the
editor state. The new state is found by reading their {@link
Transaction.state `state` property} instead of explicitly applying
them. The state class is called {@link GardState} and is quite similar
to ProseMirror's `EditorState`.

What ProseMirror calls transaction metadata is called {@link
Transaction.Annotation annotations} instead in Wordgard. There is also
a concept of {@link Transaction.Effect effects}, which are somewhat
like annotations except that instead of describing the entire
transaction, they represent specific effects the transaction has on
the state, and can be {@link Transaction.Effect.map mapped} through
changes.

The {@link Wordgard editor} object still has a {@link
Wordgard.dispatch `dispatch` method} that is the way to update the
editor state. Instead of a constructed transaction object, you'll
generally just pass it a spec object.

</section>

<hr class=floral>

<section>

## Editor

The editor component, `EditorView` in ProseMirror, is called {@link
Wordgard}. It still renders the document to editable DOM, handles
editing events, and supports document decorations.

### Input

Due to improvements in browsers, or at least due to some really bad
browsers finally becoming irrelevant, Wordgard makes heavier use of
`beforeinput` and `input` events, and thus needs to do less funky
things than ProseMirror does to read input. There's no more parsing of
changed DOM structure.

The kludge around composition, where the editor has to take care not
to touch the text node in which the browser is doing a composition, is
still needed, but implemented in a somewhat less gnarly way.

Because the way ProseMirror leaves selection, both by mouse and by
keyboard, to the browser's native implementation was an endless source
of issues, Wordgard takes it over and handles it in the library
instead. That means custom commands are bound to all the
selection-related keys, and the library does its own bidirectional
text handling.

### Cursor

Another common problem was the browser's native cursor not appearing
in the correct place (or not appearing at all). To have control over
this, Wordgard hides the native cursor and draws its own.

The native (non-cursor) selection is left visible, because it seems to
cause less touble.

### Updates

One of the biggest mistake blunders in ProseMirror is that the editor
view does not get access to the transaction objects when updating,
just the state. Wordgard does not repeat this mistake, and makes
updates take transactions, not just a new state.

This means that things like the DOM update logic and UI plugins can
precisely observe what happened, and handle changes in a efficient and
more effective way. The weird unexpected DOM redraws that are still a
thing in ProseMirror should not occur. Only the precise DOM structure
affected by the new transactions will be updated.

Wordgard updates its DOM structure asynchronously, as opposed to
ProseMirror's synchronous updates. It will implicitly eagerly update
when you try to access this structure through methods like {@link
Wordgard.posAtCoords}.

### Commands

Editor {@link Command commands} use a less arcane signature type than
they did in ProseMirror. They are functions from an editor and an
optional parameter to a boolean or transaction spec. When using them
in {@link Menu.Button menu items} or {@link KeyBinding key bindings},
you can {@link Command.bind bind} a parameter to a command.

Unlike ProseMirror commands, Wordgard commands allow extensions to
register extra {@link Command.handler handlers} to influence their
behavior in specific circumstances.

{@link KeyBinding Key bindings} are provided in your configuration as
separate objects, rather than collected in maps. (The objects
themselves count as extensions.)

### Decorations

The basic principle of decorations—that they are provided in sets and
affect nodes they point at—is the same in Wordgard as it is in
ProseMirror. Wordgard separates {@link Decoration.Point point}
decorations (those that affect a single point) from {@link
Decoration.Range range} decorations (affecting a range of content),
using different data structures both both.

Those data structures ({@link PointSet} and {@link RangeSet}) can also
be used for non-decoration values, if you need to store something in a
way that associates it with a document position and allows {@link
PointSet.map mapping} through document changes.

Additionally, Wordgard supports {@link Decoration.Tag.shape "tag"
decorations}, which affect a given node type throughout the document,
not just at a given position. These replace node views, and allow some
new things, like putting widgets next to the nodes or wrapping them in
additional DOM structure.

To specify the DOM structure of decorations (or also the default
structure of more complicated node types), Wordgard uses the {@link
Elt} abstraction, which is a bit like ProseMirror's `DOMOutputSpec` or
JSX notation, in that it creates a JS object that describes a piece of
DOM tree, without actually creating the DOM tree yet.

</section>
