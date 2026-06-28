# Code and fences

Inline code preserves Markdown markers: `**not bold**`.

```ts
const value = `template ${1 + 1}`;
console.log(value);
```

~~~text
A tilde fence can contain ``` without closing.
~~~

````markdown
```js
const nestedFence = true;
```
````

    Indented code remains code.
    - This is not a list item.

An unclosed fence follows and intentionally consumes the rest of this file:

```unknown-language
raw <tag> and **markers**
