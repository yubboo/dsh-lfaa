# dsh-lfaa

English | [中文](README.zh.md)

A complete native DSH plugin project with independently owned business modules. Appearance, layout, cards, dialogs and motion are one capability group, not the definition of the whole plugin. This is a new project designed around DSH; it does not copy or migrate the old LFAA project.

DSH owns accounts, all AI execution, sessions, models, subagents, tool dispatch and approval. The plugin contributes its own business through public interfaces and keeps business data local when needed. No second harness, login or conversation store is introduced.

## Repository

```text
packages/
  dsh-lfaa/              Plugin composition and distribution manifest
  dsh-lfaa-workspace/    Left menu, main workspace, Session tab, right pane, Settings
  dsh-lfaa-appearance/   Appearance schema and reversible theme/motion projection
scripts/                 Build and repository checks
tests/                   Focused regression tests
docs/                    Architecture, extension contracts and validation
dist/                    Generated output only; ignored
```

Package directories and manifest names use the `dsh-` prefix. Private implementation packages are bundled into one installable `dsh-lfaa` artifact; users do not install the development workspace.

## Develop

```powershell
npm install --legacy-peer-deps --ignore-scripts
npm run build
npm test
npm run check
```

The installable output is `dist/packages/dsh-lfaa/`. The build excludes private workspace dependencies, development source, test fixtures and user data. Install that output through DSH's official profile plugin command, not the repository root. The package is currently private and is not published by this workflow.

The current implementation contributes native workspace surfaces and the first interface-experience module. Other business capabilities are not defined or claimed. Read the [architecture](docs/architecture.md), [extension points](docs/extension-points.md), [development standard](DEVELOPMENT.md), [agent rules](AGENTS.md) and [actual validation](docs/validation.md).
