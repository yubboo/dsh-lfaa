# Phase 3: Minecraft server development record

English | [中文](phase-3-minecraft.zh.md)

Date: 2026-10-15

## Goal and phase scope

The product goal is to let users choose Paper, Fabric, modded server types, and the Minecraft versions each distribution actually publishes and can serve. Version lists must come from live distribution metadata rather than a stale fixed table.

The Development Master Prompt starts Phase 3 with a real server loop. Following the user's explicit direction, Agent tools are part of that deployment loop: the model discovers a distribution/version, checks Java, and decides whether to install an official JRE before continuing. The global workspace lets the user select a DSH conversation and submits requests through the Session Controller to that conversation's Agent; the conversation view tab uses its bound Session directly. Paper and Fabric servers are implemented, and Fabric mods can be searched and installed from Modrinth. Forge, NeoForge, Quilt, hybrid servers, modpacks, and proxies remain unimplemented.

## Implemented

- Added [dsh-lfaa-minecraft](../packages/dsh-lfaa-minecraft/README.md), assembled by the root plugin and provided on Host as `ctx.lfaaMinecraft`.
- The version catalog reads PaperMC Downloads Service v3 and discovers published stable release versions dynamically. Pre-releases are excluded from the default stable selection. The build catalog returns only builds Paper marks `STABLE`.
- Fabric versions and stable Loader/Installer metadata are discovered through Fabric Meta. Fabric's official server-JAR endpoint does not publish an expected size or SHA-256; the implementation caps download size, validates the JAR ZIP header, and records its local SHA-256 without claiming publisher-checksum verification.
- Fabric server mods are searched from Modrinth for the selected Minecraft version. The Agent shows project IDs and server-side compatibility; installation targets only stopped Fabric instances, resolves required dependencies with bounded depth/count, checks available disk space, refuses overwrites, and verifies each JAR against Modrinth SHA-512 metadata. Modpacks and other loaders are not included.
- Server downloads use Paper's official URL, published exact size, and SHA-256. The artifact is streamed into an instance temporary file and renamed to `server.jar` only after integrity checks pass.
- Java requirements come from Mojang version metadata, with Paper's current compatibility table used when legacy metadata lacks the field. `inspect_java` checks Java installations on PATH, under `JAVA_HOME`, and in common installation directories through DSH subprocess. When no compatible runtime exists, the model can call `install_java`; the service gets an official Temurin JRE URL, size and SHA-256 from Adoptium metadata, verifies the archive, extracts it through DSH subprocess `tar`, and checks the installed version in the user-selected data root.
- Added the `minecraft_server` Agent tool. The model separately calls catalog/build discovery, Java inspection/installation, instance creation, Paper installation, and lifecycle actions, using each result to choose its next step. Missing Java is no longer a terminal failure or silently installed by the domain service.
- Added a session workspace panel for Paper/Fabric version discovery, create/install, status, start/stop, configuration read/update, instance file listing/reading, console read/single-line commands, backup create/list/restore, and Fabric mod search/install requests. EULA has a separate user confirmation action; installation neither accepts it nor starts the server.
- Downloads, file writes, console commands, and server-process actions use DSH sandbox policy and one-call approval; a denied or cancelled approval ends the operation and cannot be bypassed with another tool.
- Creates UUID instance directories under a caller-supplied absolute local data root: `<dataRoot>/dsh-lfaa/minecraft/instances/<uuid>`. Instance metadata, EULA and `server.properties` use `ctx.fs`.
- Writes `eula=false` at creation. Only an explicit `accepted: true` call records consent; startup is refused otherwise.
- Starts Java with explicit argv and no shell. stdout/stderr collection is bounded. The service reports ready only after Paper emits `Done (...)! For help, type "help"`.
- Provides instance listing, status, bounded console reads and single-line commands, graceful stop, DSH-managed termination after timeout, restart, and process cleanup on plugin disposal.
- Validates the name, port, memory, data path and port availability at creation; validates free disk space, Java compatibility and official artifact metadata before installation.

## Filesystem execution limitation

The current public DSH `ctx.fs` supports path resolution, text IO and raw byte reads, but does not expose directory creation or raw byte writes. The implementation therefore uses Node local filesystem APIs to create instance directories and stream the binary JAR. Before writing, it checks that the DSH filesystem and subprocess providers map to the same local path; it refuses when that cannot be established. Text metadata continues through `ctx.fs`. The implementation currently requires a shared local filesystem and does not claim support for remote or isolated execution worlds.

## Incomplete or not yet exercised

- Java 21 exists at `C:\Program Files\Java\latest\jdk-21` but is not on PATH. Common-directory scanning has been added but has not yet been confirmed in the DSH Profile by the Agent tool.
- Paper has not been downloaded, an instance has not been created, and real server readiness, port binding, live console and graceful stop have not been exercised. Starting a server requires explicit EULA consent through the new panel.
- Actual DSH Profile loading, data retention across package upgrades, recovery after abnormal exit, and Agent tool discovery/call/approval behavior through the panel remain unverified. A successful build and code registration do not prove real-environment acceptance.
- Paper and Fabric stable versions are dynamically returned by the Agent tool. The user selects from the conversation result and enters that version in the workspace before installation; there is not yet a pre-populated version dropdown. Fabric has not yet been installed or started in a real runtime, and Modrinth search/install has not been exercised against a real DSH Host. Forge/NeoForge, Quilt, hybrid servers, modpacks and proxies have no adapters.

Phase 3 remains in progress. The code must not be described as having passed real server acceptance. Before Phase 4, verify Paper discovery, installation, explicit user EULA consent, real readiness, console and stop in the actual DSH environment.

## Official references

- [PaperMC Downloads Service](https://docs.papermc.io/misc/downloads-service/): API v3, required User-Agent, stable builds and checksum fields.
- [Fabric Meta API](https://meta.fabricmc.net/): official game-version, loader/installer and server bootstrap endpoints.
- [Modrinth API: Search projects](https://docs.modrinth.com/api/operations/searchprojects/) and [List project versions](https://docs.modrinth.com/api/operations/getprojectversions/): version-compatible Fabric mod search and file metadata.
- [PaperMC Getting Started](https://docs.papermc.io/paper/getting-started/): Java compatibility and server launch requirements.
- [Mojang version manifest](https://piston-meta.mojang.com/mc/game/version_manifest_v2.json): entry point to each Minecraft version's metadata.
- [Adoptium API Cookbook](https://github.com/adoptium/api.adoptium.net/blob/main/docs/cookbook.adoc): official versioned Java download URLs, asset metadata, and SHA-256 verification examples.
