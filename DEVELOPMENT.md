# Development standard

English | [中文](开发规范.md)

Understand the requested behavior before editing. Convert it to observable acceptance criteria, identify its package owner, public DSH interface, settings, data and permission scope. Clarify ambiguity that changes behavior or ownership; do not add imagined business features.

Prefer the smallest direct implementation. Change only the affected owners and consumers. The root workspace orchestrates development; `packages/dsh-lfaa` composes the public plugin, `packages/dsh-lfaa-workspace` owns native UI integration, and `packages/dsh-lfaa-appearance` owns the current appearance module. Names and directories use `dsh-`; dependencies are declared and imports cross package boundaries through exported names. New packages need a real independent responsibility and bilingual README, not a placeholder architecture.

DSH is the sole harness and permission owner. Preserve account/object/node authorization and input/concurrency validation at actual executors. Local business storage must use trusted Host identity; Profile, Session, anonymous identity and account are distinct. Do not copy credentials or introduce debug authentication bypasses.

Settings follow one schema→Host validation/persistence→ConfigForms→consumer chain. Preserve existing preferences. UI adapts to native theme/font/accessibility tokens and real container sizes using Grid/Flex, including narrow panes and short screens. Dialogs retain focus, keyboard, scrolling and reachable actions. New CSS variables require nearby Chinese comments describing their surface, color/opacity or effect strength.

Avoid repeated requests/subscriptions, overlapping work, unbounded logs and per-token heavy updates. Dispose events, timers, streams and layers. Use motion only for a clear purpose and honor reduced motion. A unit test does not establish frame-time performance.

Build only into root `dist/`; the installable package is `dist/packages/dsh-lfaa/`. Do not emit lib/build/dist trees in source packages. Bundled private packages must not escape as unresolved runtime dependencies. Distribution uses explicit files and excludes tests, upstream references, real data and secrets. Do not run dependency lifecycle scripts unnecessarily.

Run `npm run build`, meaningful focused tests and `npm run check` for the affected change. Native changes need a real DSH Loader/profile test. UI changes need the actual DSH page in the built-in browser at desktop and relevant narrow/short sizes; record route, viewport, behavior and screenshots, or the specific blocker. Real AI/node operations are separate evidence and require the user's actual task scope.

Maintain documentation in English/Chinese pairs. Update architecture, extension contracts, package READMEs and validation when ownership or behavior changes. Report actual checks and untested areas, preserve unrelated files, and remove only verified task-created temporary residue. Do not commit or publish without an explicit request.
