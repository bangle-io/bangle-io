!{"type": "examples", "title": "Origin Example", "injectCode": "blame.ts", "importmap": true}

# Example: Origin Tracking

In this example, we'll build a feature that, for all content added to
the editor, tracks an origin. For simplicity, our origins will simply
be one of three colors (that we display as background for the
content), but it could be something like a user reference.

<hr class=floral>

## Blame Map

We'll define a data structure that, for each part of the document,
know who (which color) inserted it. This will be represented by two
arrays: an array of numbers, indicating the end of each section, and
an array of strings, for the colors. Because the sections cover the
whole document, we don't need to store their start positions. The
first one starts at 0, and the others at the end of the section before
them.

!map

A change set's {@link ChangeSet.iterGaps `iterGaps` method} tells you
precisely what parts of the document are left intact by the changes
(passed to the first callback) and what parts were replaced (given to
the second callback). The blame map's `update` method uses that to
copy sections that overlap with unchanged ranges over to the new set,
and fill in any inserted content with the current active color.

<hr class=floral>

## State Field

That gives us a way to track blame information across document
changes. To keep such information with the editor, we'll want to keep
it in a state field. The `BlameState` class is the object we'll store
in that state. It holds the current active color, the blame map, and a
set of decorations the display that blame map.

!state

To be able to change the active color, we define a `setColor` effect
and make the state update logic check whether it is present.

The state field's `create` method just throws an error. Because we
need to initialize the active color, we will use its {@link
GardState.Field.init `init` method} to override this with a custom
initializer.

The state field defines `toJSON` and `fromJSON` functions, so that it
can be serialized as part of the state with {@link GardState.toJSON}.
This demo doesn't actually use that, but being able to preserve blame
information across sessions sounds useful.

The `blameDeco` function converts a blame map to a set of attribute
decorations. Because the {@link Decoration.Range range decoration}
object for a given color will be needed a lot, we make sure to create
those only once per color.

!deco

<hr class=floral>

## Result

Finally, the `blameTracking` function returns the extension that
enables this feature. It takes the active color it should start with
as an option, and initializes the state field accordingly.

!bundle

This is what the result looks like:

<div id=editor></div>

<p>Select your color: <select id=colors>
  <option value="#fcc">Red</option>
  <option value="#cfc">Green</option>
  <option value="#ccf">Blue</option>
</select></p>

<script src="./blame.js" type=module></script>
