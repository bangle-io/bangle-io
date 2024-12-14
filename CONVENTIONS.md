# Project instructions

Use the project specification guidelines to build this note taking web app.

Write complete code, do not get lazy.

Your goal is to completely finish whatever I ask for. 

## Tech stack

- React
- Typescript
- Vite
- Vitest
- playwright
- tailwindcss
- shadcn

## Project structure

Project is divided into 6 major layers

- core: most of the business logic
- platform: platform specific code that provides abstraction over things like database, file system, etc. For example browser env will be abstracting over indexedb. 
- shared: shared code, types, config constants.
- tooling: build tools, scripts, etc.
- ui: react components, are aware of shared code.
- js-lib: are agnostic libraries that are not aware of any other layer.


## Guidelines

- donot remove code comment unless asked for or the situation really needs it.