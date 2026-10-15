# Project rules

English | [中文](AGENTS.zh.md)

- dsh-lfaa is a complete native DSH plugin. Appearance and layout are one business module group. Add other capabilities only for explicit requirements.
- Build from scratch around DSH. Do not reference, copy or migrate old LFAA code, layouts, configuration, accounts or data.
- DSH owns accounts, AI, sessions, model requests, agents/subagents, tool dispatch and approval. Use public extension points; do not create another harness or hidden fallback.
- Integrate the left menu, central workspace, conversation/trajectory view tabs, right pane and Settings. Preserve each native scope and lifecycle.
- Every package directory and manifest name must start with `dsh-` and match. Current owners are `dsh-lfaa`, `dsh-lfaa-workspace` and `dsh-lfaa-appearance`.
- Keep one owner per rule, setting and data format. UI and Tools call the same business owner. Validate and persist settings before consumption; trusted account identity fences local business data.
- Registrations and resources must dispose. Preserve accessibility, theme/font preferences and reduced motion. Never patch upstream sources or target private DOM/classes.
- Generated files belong only in root dist. Distribution excludes private source dependencies, fixtures, reference checkouts and user data. Preserve other work.
- Maintain English/Chinese documentation pairs. Follow [DEVELOPMENT.md](DEVELOPMENT.md) and [architecture](docs/architecture.md).
- Report source/unit, Loader, browser, real-model and node evidence separately. Never turn a matching version or mock success into a runtime claim.
