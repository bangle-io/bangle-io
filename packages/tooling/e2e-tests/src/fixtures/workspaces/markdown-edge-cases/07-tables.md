# Tables

| Left | Center | Right | Escaped pipe |
| :--- | :----: | ----: | :----------- |
| plain | **bold** | `code` | a \| b |
| line 1<br>line 2 | [link](https://example.com) | 42 | empty follows |
|  |  |  |  |

A compact table without outside pipes:

Name|Value
---|---
alpha|one
beta|two

An intentionally malformed table-like block must remain recoverable:

| too | many | cells |
| --- | --- |
| one | two | three | four |
