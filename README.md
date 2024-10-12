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

## High-Level Architecture

The application is divided into the following modules:

- **Base:** Utilities and generic stuff.
- **Platform:** Defines services and base code.
- **Editor:** The editor component.
- **Workbench:** Contains the main application features and contribs .
- **Entry-Browser:** The entry point for the browser.

### Base

All the generic utilities and support code.

### Platform

- **App Level Events:** Manages workspace-related events such as `workspace-create`, `workspace-update`, and `workspace-delete`.
- **Database:** Placeholder for future database implementation.
- **Routing:** Handles application routing.
- **State Management:** Uses the library 'Nalanda' for state management.
- **Worker:** Manages web worker processes.

### Workbench

- **Workbench API:** Core APIs for the workbench.
- **Workbench Contribs:** Modules that register themselves in a \*.contrib.ts file.

### UI

- **Styling:** Manage the visual appearance.
- **Libraries:** External libraries used.
- **Notifications:** System for user notifications.
- **Modals:** Dialog and modal management.
- **Forms:** Form management and validation.
- **Layout:** UI layout management.
- **Icons:** Icon management and integration.

### Editor

The core text editor component.

### App Core

### Build

#### tooling

- [x] plop
- [x] scripts
- [x] eslint / prettier -biome
- [x] jest
- [x] bangle config
- [] TSC
- [] verify

#### Styling

- color scheme

- **Scripting:** Build and deployment scripts.
- **index.html:** The main HTML entry point.
- **CSS:** Stylesheets.
- **Assets:** Static assets.
- **Deployment:** Deployment processes and configurations.
- **Linting:** Code linting.
- **Types:** TypeScript type definitions.
- **Formatting:** Code formatting rules.
- **Package Management:** Dependency management.
- **Testing:** Testing framework and tests.
- **Infra Management:** Infrastructure management.

## Project Management

Handling the project's management and coordination.

## Marketing

Strategies for promoting the tool.

# Appendix

## Note on VSCode

- **Browser Entry Point:** code/browser - [VSCode GitHub](https://github.com/microsoft/vscode/blob/42b3bac02e37836393b4c4b46fcc91aa03e02aa8/src/vs/code/browser/workbench/workbench.ts)
- **Registration:** Everything registers themselves in workspace/contrib.
- **Platform:** Contains services.
