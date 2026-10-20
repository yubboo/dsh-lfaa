# dsh-lfaa-workspace

English | [中文](README.zh.md)

Private browser package for native left navigation, main panel, Session view tab, right inspector and Settings section. Owns UI copy, scoped styles and local interaction state. Injected DSH services and framework hooks supply identity/configuration; components never own ctx or a transcript store.

The global workspace lists DSH conversations through the public `useSessions` hook and lets the user choose which conversation receives Minecraft requests. The Session view tab uses its framework-bound Session directly. Requests go through the DSH Session Controller to the existing Agent; the panel does not execute a second tool path.

Consumes dsh-lfaa-appearance and host-shared React/primitives. Workspace and Settings share one ConfigForm; failures/read-only states remain visible. Registrations, stylesheet, settings/OS subscriptions and token layers dispose. Container queries adapt main/Session/settings/narrow panes; native Modal keeps keyboard/focus ownership. Build through root scripts; actual browser/Loader evidence is separate from fixture tests.
