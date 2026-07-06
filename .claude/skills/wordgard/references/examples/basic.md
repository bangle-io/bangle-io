!{"type": "examples", "title": "Basic Editor Example", "deriveTOC": true}

# Example: Basic Editor

This example discusses the most basic parts of the library interface,
the ones you use to create an editor from pre-defined configuration
elements, add it to a web page, and read out the changed document.

<hr class=floral>

<section>

## Creating an Editor

To get a working editor, you'll need at least a document schema, and
you'll usually want to also include the undo history and an extension
to display a menu.

The {@link basicSchema} extension (paragraphs, headings, emphasis,
links) provides a good starting set of schema elements, allowing you
to pick extra elements (for example {@link orderedList lists}) by
including them in your configuration bit by bit. If you just want
everything the ["wordgard/schema"](../docs/ref/#schema) module
provides in one bundle, you can include {@link fullSchema}.

This code sets up a simple editor and adds it to the element with the
ID `editor-parent`.

```javascript
import {Wordgard, menuBar} from "wordgard/editor"
import {basicSchema, orderedList} from "wordgard/schema"
import {history} from "wordgard/history"

const wg = Wordgard.create({
  parent: document.querySelector("#editor-parent"),
  doc: `<p>A starting document.</p>`,
  config: [
    Wordgard.label("Demo editor"),
    basicSchema(),
    orderedList(),
    history(),
    menuBar()
  ]
})
```

The `doc` option may also be a DOM element that contains the document
structure, a document in {@link Node.Shared.toJSON JSON} form, or an
existing Wordgard {@link Plot.Doc document}.

The editor configuration is derived from the tree (arrays with
potentially more nested arrays in them) of extension you provide.
Functions like {@link basicSchema} and {@link history} return
collections of extensions that implement the features they provide. On
initialization, the editor creates a full {@link
GardState.Configuration configuration} from these and stores it in the
editor state.

{@link Wordgard.label} adds an
[`aria-label`](https://developer.mozilla.org/en-US/docs/Web/Accessibility/ARIA/Reference/Attributes/aria-label)
attribute to the editable element, so that screen readers can describe
it. It's usually a good idea to include this in your configuration.

An editor has two important DOM elements associated with it. The outer
wrapper element is available through the {@link Wordgard.dom}
property. If you don't pass a {@link Wordgard.Spec.parent `parent`
option} you can manually place your editor by putting that somewhere
in your page. Moving an editor around, even into another frame, is
supported.

The editor's editable element containing the document itself is
exposed through the {@link Wordgard.contentDOM} property. You
generally don't need to interact with this (modifying its content
directly doesn't work), but this is the element that will have focus
when the user has focused the editor.

</section>

<hr class=floral>

<section>

## The Editor State

Your editor's state is available under the editor object's {@link
Wordgard.state} property. It holds most of the information about what
is going on in the editor. The main thing you can get from it is the
current shape of the document, under its {@link GardState.doc}
property.

To get the current content as HTML, you can do this:

```javascript
import {serialize} from "wordgard/doc"
console.log(serialize(wg.state.doc).toHTML())
```

If you want to store your document as a JSON structure instead, use
`wg.state.doc.toJSON()`. You can pass the resulting value in the `doc`
field to {@link Wordgard.create} to create a new editor with that
document.

As the user edits the document or other changes to the state occur,
the editor creates new {@link GardState state} objects to represent
the new situation. The existing one is not modified, so holding on to
one and expecting it to stay in sync with the editor does not work.

</section>

<hr class=floral>

<section>

## Loading a New Document

If you want to show another document to your user, do not update your
existing editor by replacing its document content. That will keep any
auxilary state, such as the undo history, from the existing editing
state.

Instead, create a new editor with a fresh state. Since the document
has to be redrawn anyway, there's not much extra cost saved by trying
to preserve your old editor. Remove it its {@link Wordgard.dom outer
DOM element} from your page and put a new editor in its place.

</section>
