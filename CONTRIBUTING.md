_This is [bangle.io](http://bangle.io) ._

Hey there, this document will cover how to setup [bangle.io](http://bangle.io) locally and also a brief overview of its architecture.

## Setup

The project is broken down into many smaller packages.

`yarn install` to install

`yarn start` to start bangle on `localhost:4000`

`yarn jest` to run the tests

`yarn g:e2e` to run the integration tests

More commands in the `package.json`.

> If you are wondering about `g:` in `yarn g:e2e`, it is a yarn thing which allows to run a packages command from anywhere.

# Fledgling Architecture :grinning:

### File structure

Bangle has the following top level directories containing smaller packages.

- `lib: `The packages that are shared across the app.

- `js-lib: `Independent packages that have no awareness of bangle and have no dependency on any part of the code.

- `extensions: `All of the first party extensions sit here. 90% of the src code lives in here. If you are building an extension, you would wanna go through it.

- `app: `The core packages sit in here.

- `worker: `Separate directory for any code that will be run the web worker.

- `tooling:`The code that will not show in the actual app. For example integration tests, validation scripts, etc.

### Contexts

- action-context: for dispatching actions.

- app-state-context: used for pending writes, page lifecycle etc.

- editor-manager-context: exposes editors

- ui-context: for ui state and also persists select UI state in localstorage.

- workspace-context: place for centralised workspace ops like note creation,  and deletion etc.

- extension-registry-context: the glue code for the extension. If you are developing an extension you can ignore this.

## Actions

Action is a syncronous fire and forget system. The dispatcher of action is not expected to handle the failure. If while handling the action a failure occurs, its up to the handler to show a popup notification to the user or not.

Every handler in the application will be called in the order of their setup, untill one of them returns true. The handler returning true will be considered as the true handler of the action. This mechanism exists for other extensions to passively watch an action being dispatced, though they do need to be defined before the true handler extension.

## WsPaths

- Everything is denoted by `wsPath`, example `hello:foo/bar.md` here hello is the `wsName` and `foo/bar.md` is the path to the file.
