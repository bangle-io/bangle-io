## Frequent commands

```bash
# update all packages
pnpm -r update --latest

```



# Architecture Proposal

**Date: 2024-07-01**

## Introduction

This is my third attempt at creating a note-taking tool. It’s a clichéd endeavor for any web developer, yet I feel compelled to pursue it. The urge to build such a tool probably strikes 99% of developers at some point in their careers. Despite recognizing the futility of this idea, as I mentioned earlier, I still want to go through with it.

I have a few reasons for this irrational pursuit, which has often come at a cost of my personal life. But I will not delve into those reasons here. Instead, I will focus on the architecture of this tool.

## Goals

These are short-term (\~1 year) goals:

- Ensure users can start taking notes in less than 30 seconds.
- Create a simple, keyboard-friendly UI.
- Develop a frontend-heavy note-taking tool that saves notes to the local filesystem, featuring a WYSIWYG editor while saving notes in markdown format.
- Incorporate features similar to VSCode, such as split-screen functionality.
- Design a scalable, efficient, and fast architecture that can be maintained by a single developer, allowing for future features like collaboration, cloud sync, and authentication.
- Offer a free and functional open-source version, while providing valuable paid features to generate revenue.
- Prioritize maintainability over performance, ensuring the app remains easy to maintain and doesn’t get abandoned within a few months.
- Mobile Safari support is OK, but not a priority.

### Non-Goals

Non-goals for the short term are:

- Implementing a backend, but should be easy to add in the future.
- Collaboration features, but still should be easy to add in the future.
- iOS and Android apps.

## Current State

I have been working on this project for at least 4 years, often starting over and chasing the wrong things.


## Architecture

Bangle has multiple workspaces (dirs directly under `/packages`), and each workspace has a specific purpose and dependency tree. The field `bangleWorkspaceConfig.allowedWorkspaces` in the `package.json` file defines the allowed workspace a package in a workspace can depend on. 

For example  if the `allowedWorkspace` for `core` workspace is `['core', 'ui', 'tooling']`, then a packages within the `core` workspace add dependencies from packages in the `core`, `ui`, and `tooling` workspaces.

Here is a brief overview in order of dependency (top most can depend on any workspace below it, and so on):

### tooling

All the tooling/build related code is here. This is where we also define vite config to start the app. This also contains build related and other miscellaneous scripts.

Can freely import from any workspace any workspace.

### core

This is the core of the app. It contains the core logic of the app.

Like tooling it also has a liberal `allowedWorkspaces` config and can import from any workspace listed below.

### platform 

This is where we define the platform specific code. For example, routing related logic specific to the web platform.


### ui

This is where we define all the dumb UI components, that are mostly agnostic of the app logic.


### shared

This is where we define shared types, config and constants that can be used across multiple workspaces. For example, shared utility functions.

### js-lib

This is where we define all the utility code that is agnostic of the app. For example, a markdown parser. It should not have any dependencies on any other workspace. Think if it as general purpose utility library.