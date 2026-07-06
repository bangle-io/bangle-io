!{"type": "examples", "title": "Translation Example", "injectCode": "phrases.ts", "importmap": true}

# Example: Translation

Wordgard comes with a simple system for translating text presented to
the user. A {@link PhraseSet phrase set} is an object that collects a
number of phrases, each tagged with a short string. If you make sure
all the text you display to the user comes from such a set, extensions
can provide alternative phrases.

You define a set like this:

```javascript
import {PhraseSet} from "wordgard/phrases"

export const myPhrases = PhraseSet.define({
  error: "Catastrophic error",
  word_count: "$1 words"
})

export const myPhrasesGerman = myPhrases.translate({
  error: "Katastrophaler Fehler",
  word_count: "$1 Wörter"
})
```

You can then call `myPhrases.get(state, "error")` to access a phrase.
That method will replace `$` placeholders with additional arguments it
gets. So `myPhrases.get(state, "word_count", 102)` returns `"102
words"`.

Or, if you include `myPhrasesGerman` in your configuration, it returns
`"102 Wörter"`.

Sometimes references to such phrases need to be passed around.
`myPhrases.ref("error")` returns a function that, when called with an
editor state, returns the value of the phrase.

This system is intentionally so simple that it adds very little
complexity to the core library. It does not have the kind of features
that proper internationalization libraries have. This suffices for
many situations, but if you're doing something that requires more
advanced features, you might want to use a real internationalization
library instead.

<hr class=floral>

The `phrases` export from `"wordgard/phrases"` holds the text used by
the basic menu and dialogs. This is what a Dutch translation of those
phrases might look like:

!dutchPhrases

Note that there are a few other phrase sets in the package, which
depending on whether you use the {@link imagePhrases image dialog},
{@link colorNames color picker}, or {@link tablePhrases table
support}, you may also need to translate.

This is what our partially-translated editor looks like:

<div id=editor></div>

<script src="./phrases.js" type=module></script>
