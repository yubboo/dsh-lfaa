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
  dsh-lfaa-minecraft/    Host-side Paper/Fabric instances, lifecycle, and Modrinth Fabric mods
scripts/                 Build and repository checks
tests/                   Focused regression tests
docs/                    Architecture, extension contracts and validation
dist/                    Generated output only; ignored
```

Package directories and manifest names use the `dsh-` prefix. Private implementation packages are bundled into one installable `dsh-lfaa` artifact; users do not install the development workspace.

## Develop

```powershell
pnpm install
pnpm run build
pnpm test
pnpm run check
```

The DSH repository root is also an install facade: its manifest points to `dist/packages/dsh-lfaa/`, and its Git `prepare` lifecycle builds that package. In DSH's Add Plugin dialog, enter the repository URL `https://github.com/yubboo/dsh-lfaa.git`; for a local install, run `pnpm run build` first and enter this repository's root directory. The build excludes private workspace dependencies, development source, test fixtures and user data. The package name `dsh-lfaa` works after the built distribution is published to npm. On Windows, run `publish-npm.bat` from the repository root: menu 6 safely pushes to GitHub `main`, requiring a commit message that starts with a new three-part source version; menu 7 builds, previews and publishes to the official npm registry after confirmation, and menus 1–5 provide package checks. The last pushed source version is read from GitHub commit history, with a local Git config fallback. The menu implementation is `scripts/publish-menu.ps1`; the batch launcher stays ASCII-only so CMD does not misparse its UTF-8 menu text. The script does not change the npm package version.

Minecraft currently supports Paper and Fabric Host services and Agent operations, with a session workspace panel for distribution/version discovery, server create/install, status, start/stop, configuration, file inspection, console commands, backup/restore, and mod search/install. Fabric mods are searched through Modrinth by Minecraft version and installed only into a stopped Fabric instance; required dependencies are resolved recursively and downloaded files are checked against Modrinth SHA-512 metadata. Modpacks, Forge, NeoForge, and end-to-end acceptance in a real DSH Profile remain unfinished. The panel submits explicit requests into the active DSH conversation; the Agent inspects Java and may install an official Temurin runtime when needed, while downloads, writes, and process actions remain subject to DSH approval. The user must explicitly confirm Minecraft EULA acceptance. Paper downloads carry publisher SHA-256 metadata. Fabric's official HTTPS bootstrap endpoint does not publish the same checksum metadata, so the plugin records the downloaded file's local hash and validates its JAR format without claiming publisher-checksum verification.
