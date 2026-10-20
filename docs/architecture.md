# Architecture and ownership

English | [中文](architecture.zh.md)

dsh-lfaa is a new complete native plugin with its own business modules. Appearance/layout is one capability group. DSH owns all AI execution, accounts, models, agents/subagents, tool dispatch, approval and authoritative conversation data. The plugin has no separate harness, login, Provider request path or transcript store. Old LFAA designs, source and data are not reused.

| Package | Responsibility | Runtime and dependencies |
|---|---|---|
| dsh-lfaa | Public manifest, bundle patch and Host composition; re-exports the owned configuration schema | Host; bundles the private implementations for distribution. |
| dsh-lfaa-workspace | Left navigation, central panel with DSH conversation selection, Session view tab, Minecraft controls, right inspector, Settings, localized UI and scoped CSS | Browser; DSH Slots/Locale/Layout/ConfigForms/Sidebar/Session hooks, host-shared React/primitives, appearance projection. |
| dsh-lfaa-appearance | One settings schema and reversible host-token projection | Host schema and separate browser-safe projection; no database, AI or navigation ownership. |
| dsh-lfaa-minecraft | Dynamic Paper/Fabric catalogs, Fabric mod discovery, instance metadata, verified installation, Java runtime management and server process lifecycle | Host; uses `ctx.fs`, `ctx.subprocess`, and the `minecraft_server` Agent tool. The workspace sends requests through the selected DSH conversation; there is no parallel Remote execution path. |

Source packages live under packages and declare their dependencies. Cross-package imports use package exports. Build scripts inline the private implementations into the single installable `dist/packages/dsh-lfaa/`, whose manifest has no private workspace dependencies. The repository root is an install facade over that output: local root installs need a build first, and Git installs build during `prepare`. The source package directory remains a development-only target.

The left menu selects a keyed main panel. That global panel uses DSH's public session-list hook and requires the user to choose a conversation for Agent operations. The plugin also contributes a Session-bound tab beside Conversation/Trajectory and a per-Session right-pane type. All surfaces share one ConfigForm; no transcript is reconstructed or copied. Details and scope restrictions are in the [extension contract](extension-points.md).

Settings defaults are enabled=true, preset=native, density=comfortable and motion=system, owned by the appearance schema. DSH validates/persists Profile configuration and exposes it through ConfigForms. These are not account business data. New storage must use verified Host account identity, distinguish Profile/Session/node scope, and handle account changes and in-flight operations explicitly.

Default presentation preserves the host palette, fonts and theme preference. Optional soft/crisp presets override only known consumed tokens in paired light/dark values. Native Modal retains keyboard, focus and dismissal behavior; upstream public APIs do not promise arbitrary replacement of every dialog. UI uses container-aware Grid/Flex and localized copy; subscriptions and styles dispose with the plugin, without polling or DOM scanning.

The supported DSH package baseline is the official `dsh-v0.2.1-rc.2` release ([source tag](https://github.com/deepseek-ai/deepseek-harness/tree/dsh-v0.2.1-rc.2), release commit `687f282`). Every declared DSH peer is pinned to `0.2.1-rc.2` so the installer's peer check matches that runtime. Source exports, published artifacts and a live installed runtime are checked separately; matching peers alone do not prove full runtime compatibility. See [validation](validation.md). No upstream source fork or hidden old-harness fallback is permitted.

Phase 3 includes Paper and Fabric Host services, Java runtime discovery/installation, Fabric mod search/install, and the `minecraft_server` Agent tool. The workspace submits user-selected actions through a chosen DSH conversation. Forge, NeoForge, Quilt, hybrid servers, modpacks and proxies are not implemented. Real Profile loading and server startup remain unverified; see the [Phase 2 audit](phase-2-audit.md) and [Phase 3 record](phase-3-minecraft.md).
