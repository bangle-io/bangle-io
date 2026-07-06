!{"type": "examples", "title": "Configuration Example", "deriveTOC": true}

# Example: Configuration

This example discusses the way configuration of a Wordgard editor
works, and shows some common usage patterns.

<hr class=floral>

<section>

## The Role of Configuration

Almost all configuration is optional. The editor will refuse to
initialize without a schema, but if you pass in a document node in the
{@link GardState.Spec.doc `doc` field}, you can omit the {@link
GardState.Spec.config `config` field} entirely.

But such an editor will not have a menu, undo history, or any of the
extensions included in the schema element extensions, such as {@link
InputRule input rules} or element-specific {@link KeyBinding key
bindings}.

A design principle of this library is that the core just provides a
platform for editing, and most of the actual editing behavior is
implemented in extensions. A given setup can decide for which parts it
wants to use the features provided by the library, and for which parts
it wants to use its own custom implementation or a 3rd-party package.

Configuration lives in the {@link GardState.config editor state}. The
parts that affect the UI component do so via the state—the editor
will, whenever the state is updated, synchronize itself to changes in
configuration.

</section>

<hr class=floral>

<section>

## Facets

Most extensions work, directly or indirectly, though {@link
GardState.Facet facets}. Many of these are defined in the core
library, but you can also define your own.

```typescript
const saveCheck = GardState.Facet.define<
  (wg: Wordgard) => string | null
>()

function save(wg: Wordgard) {
  let problems = wg.state.facet(saveCheck)
    .map(ch => ch(wg)).filter(x => x != null)
  if (problems.length) {
    Dialog.show(wg, {
      label: "Cannot save: " + problems,
      submitLabel: "Too bad"
    })
  } else {
    makeSaveRequest(wg.state.doc)
  }
}
```

That code defines a facet that holds functions that check whether the
editor content is in a state where it can be saved. The `save`
function calls these functions. When any of them return a string, it
reports that it cannot save. Otherwise, it saves the document.

To register a save check, you'd add an extension like `saveCheck.of(wg
=> { ... })` to your configuration.

It is possible for facet sources to be {@link GardState.Facet.compute
dynamic}, computed from some other aspect of the state. This allows
them to also be useful for controlling things that don't stay the same
over the editor's lifetime, such as open {@link Panel.show panels}.

</section>

<hr class=floral>

<section>

## Configuration Structure

The {@link GardState.Spec.config `config` field} takes a {@link
GardState.Extension} value. This is a recursive type that's either an
object with an `extension` property, or an array of extensions. You
generally don't care which of these you are dealing with. The value of
a function that returns an extension can be included in your
extension, and it'll just work.

A typical pattern is for a given feature, for example the {@link
history undo history}, to be exported as a function that combines all
the smaller extensions that go into the implementation of the feature.

So a configuration like this...

```javascript
config: [history(), basicSchema()]
```

... will actually expand into a big tree that might look something
like this:

```javascript
config: [
  [                                  // history()
    historyStateField,
    historyConfig.of(config),
    Command.handler(undoCmd, undo),
    Command.handler(redoCmd, redo),
    undoButton,
    redoButton
  ],
  [                                  // basicSchema
    GardState.schemaElement.of(Doc),
    [                                // basicMarks()
      [                              // strong()
        GardState.schemaElement.of(Strong),
        strong.button,
        strong.keyBinding,
      ],
      [                              // emphasis()
        GardState.schemaElement.of(Emphasis),
        emphasis.button,
        emphasis.keyBinding
      ],
      [                              // link()
        GardState.schemaElement.of(Link),
        link.button,
        link.keyBinding,
        link.tooltip,
        link.pasteOver
      ]
    ],
    [                                // paragraph()
      GardState.schemaElement.of(Paragraph),
      paragraph.button,
      paragraph.keyBinding
    ],
    [                                // heading()
      GardState.schemaElement.of(Heading),
      heading.button1, heading.button2, heading.button3,
      heading.keyBindings,
      heading.createOnHash
    ],
    GardState.schemaElement.of(LineBreak)
  ]
]
```

You generally don't need to know about all those inner extensions
unless you want to fine-tune your configuration to omit or replace
some of them. In that case, instead of using the bundle function,
you'd include the parts that you want one by one. Making this possible
is the reason that many such inner extensions (at least those that can
meaningfully be used in isolation) are also exported.

When a given extension appears multiple times in the configuration
tree, only the occurence with the highest precedence is used. So as
long as extensions define their inner elements as constants, if you
use two extensions that both include the same sub-extension, your
configuration will deduplicate it during resolution.

</section>

<hr class="floral">

<section>

## Precedence

For many types of extensions, if they occur multiple times in a
configuration, their relative precedence determines how they behave.
For example, {@link KeyBinding key bindings} or {@link
Wordgard.domEventHandler event handlers} get a chance to handle a key
in order of precedence, {@link Decoration.Point.wrapper wrapping
decorations} wrap their target so that the one with the lower
precedence wraps the one with higher precedence.

You can control relative precedence by changing the order of
extensions in your extension tree or by assigning an explicit {@link
GardState.prec precedence} to the extension. For example, in this
configuration the key binding that logs `A` will be the first to
handle Ctrl-Space (if its handler would return false, the one that
logs `B` would get a chance to handle the key).

```javascript
[
  KeyBinding.define({
    key: "Ctrl-Space",
    run() { console.log("A"); return true }
  }),
  KeyBinding.define({
    key: "Ctrl-Space",
    run() { console.log("B"); return true }
  })
]
```

If, however, you'd wrap the second binding in {@link
GardState.prec.high `GardState.prec.high`} (or the first in {@link
GardState.prec.low `GardState.prec.low`}), the order would be
reversed.

</section>

<hr class=floral>

<section>

## Reconfiguration

When your editor configuration may change over the lifetime of an
editor, one straightforward pattern is to have a function that creates
a configuration based on some parameters, and, when the configuration
needs to change, use that with {@link GardState.reconfigure} to update
your configuration.

```javascript
import {Wordgard, menuBar} from "wordgard/editor"
import {basicSchema} from "wordgard/schema"
import {GardState} from "wordgard/state"

function config(withMenu) {
  return [basicSchema(), withMenu ? menuBar() : []]
}

const wg = Wordgard.create({
  config: config(true)
})

// When we don't want a menu any more
wg.dispatch({
  effects: GardState.reconfigure.of(config(false))
})
```

Reconfiguring a state does not reset anything it doesn't need to. Any
{@link GardState.Field state fields} that are present in both the old
and the new configuration stay unchanged, as do facet output values
that are not affected by the changes.

In cases where the code that needs to change configuration controls
only a part of the configuration, and shouldn't reconfigure the entire
editor (because it's just an editor extension, not the owner of the
editor), you have two options.

If you just need to inject some extensions, for example when you are
implementing a command that, after it takes effect, needs some support
extensions to be active, you can use {@link GardState.appendConfig} as
an effect in the transaction you dispatch. You'll want to first check
whether your extension is already active, to prevent appending it
again and again.

A more fine-grained mechanism is to use an extension {@link
GardState.Compartment compartment}. A compartment wraps part of the
initial configuration, and that part can be replaced with a different
set of extensions when necessary.

This code defines an extension that switches the editor background to
pink when you press Ctrl-Space, and back again to the default when you
press it again.

```javascript
import {KeyBinding, Wordgard} from "wordgard/editor"
import {GardState} from "wordgard/state"

const theme = Wordgard.theme({
  "&": {backgroundColor: "pink"}
})

const pinkCompartment = GardState.Compartment.define()

function toggle(wg: Wordgard) {
  let current = pinkCompartment.get(wg.state)
  let empty = Array.isArray(current) && !current.length
  return {
    effects: pinkCompartment.reconfigure(empty ? theme : [])
  }
}

export function togglePink() {
  return [
    pinkCompartment.of([]),
    KeyBinding.of({key: "Ctrl-Space", run: toggle})
  ]
}
```

It uses {@link GardState.Compartment.get `Compartment.get`} to figure
out whether the theme is active, and {@link
GardState.Compartment.reconfigure} to dispatch an effect that updates
the editor configuration.

</section>
