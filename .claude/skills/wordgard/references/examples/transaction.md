!{"type": "examples", "title": "Transaction Example", "deriveTOC": true}

# Example: Dispatching Transactions

Dispatching a transaction is what you do when you want to change the
editor content, move the selection, scroll something into view, change
an extension's state, reconfigure, or affect the editor in some other
way.

<hr class=floral>

<section>

## Document Changes

A very common thing to do is to modify the document. For example, say
we are writing a function that inserts given word at the selection,
you could write code like this:

```typescript
function insertWord(wg: Wordgard, word: string) {
  let {from, to} = wg.state.selection.replacementRange
  wg.dispatch({
    changes: {from, to, insert: [Leaf.text(word)], fit: true},
    scrollIntoView: true,
    userEvent: "insert.word",
    selection: (cx, changes) =>
      GardSelection.near(cx, changes.mapPos(to, 1), -1)
  })
}
```

The {@link Transaction.Spec transaction spec} fields that accept an
array of things, like {@link Transaction.Spec.changes `changes`} and
{@link Transaction.Spec.effects `effects`} also accept a single value
for convenience. So here we're providing a single change under
`changes`.

Selections have a {@link GardSelection.replacementRange} getter which
tells you what range should be replaced when inserting over that
selection. This exists because some {@link GardSelection.define
custom} selections might want to do something special there—for
regular selections it will just return the selection's full range.

So our {@link ChangeSet.Change change} replaces that range with a
single token, a text leaf holding our word. Because we don't know
whether replacing the selection like that results in a valid document,
the code also sets the {@link ChangeSet.Change.fit `fit`} flag. That
will cause the {@link ChangeSet.create} call that builds the change
set for the transaction to make sure it doesn't emit an invalid
change. In situations where you know the change is valid, you can
leave this off.

Further parameters given to the transaction are {@link
Transaction.Spec.scrollIntoView `scrollIntoView`}, which tells the
editor that it should make sure the cursor is visible after the
change, and {@link Transaction.Spec.userEvent `userEvent`}, which
provides a rough, if somewhat fuzzy, category for the change. The
latter isn't necessary, but can help ofter code {@link
Transaction.isUserEvent recognize} some types of transactions, and
treat them specially.

And finally, we need to provide a new selection after the insertion.
Because of the somewhat unpredictable nature of fitted changes, we
cannot just put the cursor at `from + word.length` and know for sure
that that'll be the end of the word—the fitting might cause the change
to do more than just insert that word at precisely that position. So
instead of passing a selection, the code passes in a function that,
from the changes and the post-change situation, computes a new
selection.

Many selection-manipulating functions expect a {@link
GardSelection.Context context} to be passed in. This gives them
information about the current document and the text direction in that
document. An editor state counts as a context, but in the middle of
creating a transaction, the new state is not available yet, so the
selection-creation callback is passed a temporary context. {@link
GardSelection.near} finds a cursor position near the given position.
We can pass it the position after the change (using position mapping
on the change set), and make it scan backwards to find a cursor
position after the inserted word.

This is often the trickiest part of a document-changing
transaction—finding the appropriate new selection. The {@link
ChangeSet.findInserted} method on change sets can also be useful
here.

Multiple changes can be passed as an array. This would, for example,
wrap the entire document in a blockquote:

```typescript
wg.dispatch({
  changes: [
    {from: 0, insert: [Blockquote]},
    {from: wg.state.doc.length, insert: [Plot.End]}
  ]
})
```

All changes provided in such an array are interpreted relative to the
start document, not the document produced by the changes before them.
So the second change here does not have to adjust the position of the
end of the document for the token inserted by the first change.

If you have already created a {@link ChangeSet} object, you can also
just pass that in the `changes` field.

To add or remove marks, you use a different change object form.
Instead of an `insert` field, these use `add` to add a mark or
`remove` to remove one.

```typescript
// Everything strong!
wg.dispatch({
  changes: {from: 0, to: wg.state.doc.length, add: Strong}
})

// Remove all underlines from the selection
let {from, to} = wg.state.selection
wg.dispatch({
  changes: {from, to, remove: Underline}
})
```

</section>

<hr class=floral>

<section>

## Transaction Effects

Apart from document and selection changes, transactions can contain
{@link Transaction.Effect _effects_}. Some of these, such as {@link
Wordgard.scrollIntoView} are defined in the library, but you can also
define your own.

This extension counts the number of transactions that have happened in
an editor state, with a way to reset the number. That may not be a
terribly useful thing to do, but it demonstrates a common pattern.

```typescript
import {GardState, Transaction} from "wordgard/state"

const resetCounter = Transaction.Effect.define<number>()

const transactionCounter = GardState.Field.define<number>({
  create() { return 0 },
  update(count, tr) {
    count++
    for (let e of tr.effects) {
      if (e.is(resetCounter)) count = e.value
    }
    return count
  }
})

wg.dispatch({effects: resetCounter.of(0)})
```

Instances of an effect contain a value whose type is declared when
the effect type is defined. Code that is interested in the effect will
check the array of effects attached to a given transaction to see if
its effect is in there, and if so, handle it. The {@link
Transaction.Effect.is `is` method} both checks whether an effect is of
the given type and, if it is, tells TypeScript what the type of its
`value` field is.

Some types of effects contain document positions or some other
document-dependent data. For those, you should define a mapping
function, so that they can safely be transformed through changes.
(This comes up when transaction specs are combined or transactions are
[extended](#h-extenders).)

```typescript
const highlightEffect = Transaction.Effect.define<
  {from: number, to: number}
>({
  map: (range, changes) => ({
    from: changes.mapPos(range.from, -1),
    to: changes.mapPos(range.to, 1)
  })
})
```

Effects also provide a way to make non-document changes undoable. The
history module provides a {@link history.invertedEffects} facet that
can be used to provide inverted effects for a given transaction. These
are stored in the history, and will be included in the transactions
dispatched for undone (or redone again) changes.

</section>

<hr class=floral>

<section>

## Transaction Objects

The {@link Wordgard.dispatch} method accepts either a transaction
{@link Transaction.Spec spec} or a {@link Transaction} object. It is
usually more convenient to pass it a spec as an object literal, but
when you want to initialize an actual transaction object, you can use
{@link GardState.update `state.update`}.

```typescript
let tr = state.update({selection: {anchor: 1}})
console.log(tr.state.selection.head)
```

Such transaction objects provide most of the same fields as their
specs have, but normalized (for example {@link Transaction.changes}
always holds a change set, {@link Transaction.selection} holds either
null or a full selection, and so on). These are the objects that state
field {@link GardState.Field.Spec.update update functions} and {@link
Wordgard.updateListener update listeners} see.

It is possible to work with transactions entirely outside of the
editor component. This is especially useful for tests, but can also be
used to run scripted or saved editing sessions entirely outside of the
browser.

Some helper functions or {@link Command.Pure functional commands}
return transaction specs. It can be useful to combine multiple such
specs into a single transaction. You can do this with {@link
Transaction.merge}. The specs will be combined, creating a new spec
containing the union of their changes, annotations, and effects.

By default, the changes in both specs refer to the initial document.
If you, for some reason, have changes and effects that refer to the
document produced by previous transaction specs, you can set the
{@link Transaction.Spec.sequential `sequential` flag} to make sure
they are interpreted correctly.

```typescript
// Inserts the B directly after the A
let tr = state.update(Transaction.merge(state, {
  changes: {from: 3, insert: [Leaf.text("A")]}
}, {
  changes: {from: 4, insert: [Leaf.text("B")]},
  sequential: true
}))
```

</section>

<hr class=floral>

<section>

## Extenders

Wordgard allows you to {@link Transaction.extender register} functions
that may, for every transaction, add additional elements (changes,
effects, annotations, etc).

This makes things like {@link Correction corrections} and other
extensions that preserve invariants possible. It also has less
invasive uses, like making sure transactions get some specific
annotation or effect that other code depends on.

This example defines an extender that makes sure the selection is
never between positions 5 and 10, by moving it past that range
whenever it would land in it.

```typescript
import {Transaction, GardSelection} from "wordgard/state"

const jumpyCursor = Transaction.extender.of(tr => {
  if (tr.newSelection.from >= 10 || tr.newSelection.to <= 5)
    return null
  let moved = tr.startState.selection.from <= 5 &&
              tr.newDoc.length > 10
    ? GardSelection.near(tr.state, 10, 1)
    : GardSelection.near(tr.state, 5, -1)
  return {selection: moved}
})
```

This is obviously a powerful tool that can cause trouble when used
carelessly. You'll want to think carefully about the situations in
which you want your extender (or correction) to fire, and how it could
block the user from doing something they should reasonably be able to
do.

The existence of extenders is something that code that dispatches
transactions must keep in mind. You cannot assume that, after your
transaction, the editor state is exactly what your transaction spec
produces. And you must be careful about embedding such expectations in
the effects or annotations you include in the transaction.

A similar but less radical feature are {@link Transaction.appender
transaction appenders}. These can cause the editor to immediately
dispatch additional transactions in response to other transactions.
They are the mechanism used by, for example, {@link InputRule input
rules}, which want their effect to follow the original input, but be
separately undoable.

</section>
