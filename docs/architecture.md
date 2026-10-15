# Architecture and ownership

English | [中文](architecture.zh.md)

dsh-lfaa is a new complete native plugin with its own business modules. Appearance/layout is one capability group. DSH owns all AI execution, accounts, models, agents/subagents, tool dispatch, approval and authoritative conversation data. The plugin has no separate harness, login, Provider request path or transcript store. Old LFAA designs, source and data are not reused.

| Package | Responsibility | Runtime and dependencies |
|---|---|---|
| dsh-lfaa | Public manifest, bundle patch and Host composition; re-exports the owned configuration schema | Host; bundles the private implementations for distribution. |
| dsh-lfaa-workspace | Left navigation, central panel, Session view tab, right inspector, Settings, localized UI and scoped CSS | Browser; DSH Slots/Locale/Layout/ConfigForms/Sidebar services, host-shared React/primitives, appearance projection. |
| dsh-lfaa-appearance | One settings schema and reversible host-token projection | Host schema and separate browser-safe projection; no database, AI or navigation ownership. |

Source packages live under packages and declare their dependencies. Cross-package imports use package exports. Build scripts inline the private implementations into the single installable `dist/packages/dsh-lfaa/`, whose manifest has no private workspace dependencies. The development workspace and source package directory are not installation targets.

The left menu selects a keyed main panel. The plugin also contributes a Session-bound tab beside Conversation/Trajectory and a per-Session right-pane type. All surfaces share one ConfigForm; no transcript is reconstructed or copied. Details and scope restrictions are in the [extension contract](extension-points.md).

Settings defaults are enabled=true, preset=native, density=comfortable and motion=system, owned by the appearance schema. DSH validates/persists Profile configuration and exposes it through ConfigForms. These are not account business data. New storage must use verified Host account identity, distinguish Profile/Session/node scope, and handle account changes and in-flight operations explicitly.

Default presentation preserves the host palette, fonts and theme preference. Optional soft/crisp presets override only known consumed tokens in paired light/dark values. Native Modal retains keyboard, focus and dismissal behavior; upstream public APIs do not promise arbitrary replacement of every dialog. UI uses container-aware Grid/Flex and localized copy; subscriptions and styles dispose with the plugin, without polling or DOM scanning.

The official source baseline observed on 2026-10-15 is master commit [571902028a75c64c1d767f4ae5fd099485f0ddf0](https://github.com/deepseek-ai/deepseek-harness/tree/571902028a75c64c1d767f4ae5fd099485f0ddf0), version 0.2.1-alpha.3. Source, published artifacts and installed runtime are checked separately. A matching peer version is not proof of compatibility; see [validation](validation.md). No upstream source fork or hidden old-harness fallback is permitted.

Other business capabilities must come from explicit requirements. Tools, Remote, Jobs, Skills/Preset and file/delivery extensions are available integration directions, not claims that unspecified modules already exist.
