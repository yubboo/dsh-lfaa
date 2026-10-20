# dsh-lfaa

English | [中文](README.zh.md)

Public composition package. Owns package metadata, bundle patch and Host entry; re-exports the appearance-owned Config and assembles the dsh-lfaa-minecraft Host domain service. Business/UI rules stay in their owners. Host execution uses DSH identity, settings and permissions; no AI/session service is duplicated.

The Web workspace provides Paper and Fabric server flows. Choose a DSH conversation to ask its Agent to discover distribution and Minecraft versions, inspect the compatible Java runtime and install Temurin when needed, then create a server instance. Follow-up actions cover status, start/stop, EULA, bounded `server.properties` reads and writes, console access, backups and restore. Fabric also supports searching and installing mods through Modrinth. The Agent performs operations through `minecraft_server`, so DSH approvals and local permission policy still apply. Version results return to the selected conversation; choose a version there and enter it in the workspace before installing.

The source manifest describes the distribution exports. Root build generates index.mjs, client.js and a rewritten manifest in dist/packages/dsh-lfaa, inlining private dependencies. The repository root exposes that built package to DSH: build first before a local root install; GitHub installs use the committed distribution and run no build lifecycle script. The GitHub push menu rebuilds this output before staging. This source package directory is for development. Current contributions and validation are documented at the repository root; a manifest is not proof of Loader activation.
