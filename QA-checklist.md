# QA-checklist.md

For QA ideally we should have tests in the e2e, but for things which are hard to test we have manual testing.

## Service Worker

- [ ] When a new update clicking on update reloads the application.

## Editor Tooltip

- [ ] **Scroll:** Get the floating tooltip to show in the end of a long document. Now scroll to top and try to scroll down by keeping your mouse on divs which are not part of editor like the left sidebar. Expect no weird scrolling.

## Cross tab

- Split screen the same note and rename it.
- Renaming active file should close it in any other tabs.
- Creating a new note should be propagated.
- Delete a new new note should be propagated and if active in other tab, should be closed.
- Split screen deleting the note should work across tab.