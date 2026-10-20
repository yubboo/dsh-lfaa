# dsh-lfaa-workspace

English | [中文](README.zh.md)

Private browser package for native left navigation, the three-column novel workspace, Session view tab, right inspector and Settings section. The writing workspace manages novel projects and chapters, edits the selected chapter with automatic saving, and offers AI polish/continuation suggestions. It owns UI copy, scoped styles and local interaction state. Injected DSH services and framework hooks supply identity/configuration; components never own ctx or a transcript store.

The global workspace lists DSH conversations through the public `useSessions` hook. Minecraft requests and writing prompts use the selected DSH conversation; the Session view tab uses its framework-bound Session directly. Writing prompts go through the DSH Session Controller and suggestions are read from the resulting Session events, then applied only after an explicit user action. The panel does not execute a second model/tool path or store a duplicate transcript.

Novel and chapter data lives in browser IndexedDB under a database name derived from the verified DSH account profile ID. The active editor is discarded when the account changes. This is local to the current browser profile and does not sync between devices or DSH hosts; the plugin does not treat Profile or Session IDs as account identity.

Consumes dsh-lfaa-appearance and host-shared React/primitives. Workspace and Settings share one ConfigForm; failures/read-only states remain visible. Registrations, stylesheet, settings/OS subscriptions and token layers dispose. Container queries adapt main/Session/settings/narrow panes; native Modal keeps keyboard/focus ownership. Build through root scripts; actual browser/Loader evidence is separate from fixture tests.
