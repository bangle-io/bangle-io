# Wordgard

[ [**WEBSITE**](https://wordgard.net/) | [**DOCS**](https://wordgard.net/docs/) | [**ISSUES**](https://code.haverbeke.berlin/wordgard/wordgard/issues) | [**FORUM**](https://discuss.wordgard.net/)

This is the [Wordgard](https://wordgard.net) package. It implements a
rich text editor framework for the browser.

```bash
npm i wordgard
```

```javascript
import {Wordgard, menuBar} from "wordgard/editor"
import {fullSchema} from "wordgard/schema"
import {history} from "wordgard/history"

const myEditor = Wordgard.create({
  parent: document.body,
  doc: `<h2>Hello World</h2>`,
  config: [fullSchema(), history(), menuBar()]
})
```

This project is licensed under an MIT license.
