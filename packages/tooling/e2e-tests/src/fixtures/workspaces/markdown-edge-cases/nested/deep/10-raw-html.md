# Raw HTML and inert hostile markup

<details>
<summary>Expandable summary</summary>

Markdown-like **content** inside raw HTML.

</details>

<!-- This comment should not become visible text. -->

<script>globalThis.__bangleFixtureScriptExecuted = true</script>

<img src="missing.png" onerror="globalThis.__bangleFixtureHandlerExecuted = true">

<iframe src="javascript:globalThis.__bangleFixtureIframeExecuted=true"></iframe>

Raw HTML must never execute merely because a note was opened. If it cannot be
represented safely, its source must remain recoverable.
