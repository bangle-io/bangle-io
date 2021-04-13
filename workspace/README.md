- Everything is denoted by `wsPath`, example `hello:foo/bar.md` here hello is the `wsName` and `foo/bar.md` is the path to the file.

### Indexdb

Files are just saved flat. When it comes to list them, we just filter out files that start with the
given wsName.

### Workspace

The workspace information is saved in indexdb. It contains minimal information like the name
file - rootDirHandle etc.
