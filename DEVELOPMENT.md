# Development standard

English | [中文](开发规范.md) | [Development master prompt V1.0 (Chinese)](docs/development-master-prompt.zh.md)

## New prompt and phase priority

The Development Master Prompt V1.0 is the new product-goal and phase baseline. Where it conflicts with the previous standard, its product scope, priorities and phase order take precedence; non-conflicting package-boundary, security, performance, build, release and acceptance rules remain. Confirm concrete DSH APIs, package directories and data paths against the actual source, public exports and runtime behavior during Phase 2; prompt examples are not evidence.

Development has four phases: (1) establish the professional prompt; (2) audit the existing repositories and shape the architecture skeleton; (3) complete a real Minecraft server startup loop for one verified distribution; (4) integrate the DSH Agent, workspace and formal acceptance. Work only on the phase explicitly in scope. This delivery covers Phase 1 and does not change business implementation code; Phase 2 begins with source audit.

Understand the requested behavior before editing. Convert it to observable acceptance criteria, identify its package owner, public DSH interface, settings, data and permission scope. Clarify ambiguity that changes behavior or ownership; do not add imagined business features. Advance new functionality in the phases defined by the Development Master Prompt.

Prefer the smallest direct implementation. Change only the affected owners and consumers. Preserve the three current packages: `packages/dsh-lfaa` composes the public plugin, `packages/dsh-lfaa-workspace` owns native workspace integration, and `packages/dsh-lfaa-appearance` owns appearance. Appearance is one module of the broader game-server plugin. Decide whether Minecraft or other business packages are needed after the Phase 2 audit. Names and directories use `dsh-`; dependencies are declared and imports cross package boundaries through exported names. New packages need a real independent responsibility and bilingual README, not a placeholder architecture.

DSH is the sole harness and permission owner. Verify its current public APIs against source, documentation and exports during Phase 2; never rely on private DOM or internal state. Preserve account/object/node authorization and input/concurrency validation at actual executors. Local business storage must use trusted Host identity; Profile, Session, anonymous identity and account are distinct. Do not copy credentials or introduce debug authentication bypasses.

Settings follow one schema→Host validation/persistence→ConfigForms→consumer chain. Preserve existing preferences. UI adapts to native theme/font/accessibility tokens and real container sizes using Grid/Flex, including narrow panes and short screens. Dialogs retain focus, keyboard, scrolling and reachable actions. New CSS variables require nearby Chinese comments describing their surface, color/opacity or effect strength.

Avoid repeated requests/subscriptions, overlapping work, unbounded logs and per-token heavy updates. Dispose events, timers, streams and layers. Use motion only for a clear purpose and honor reduced motion. A unit test does not establish frame-time performance.

Build only into root `dist/`; the installable package is `dist/packages/dsh-lfaa/`. The repository root is a DSH install facade that points at this output. A local root install requires `pnpm run build` first. GitHub installs use the committed installable output and do not run a `prepare` build; the GitHub push menu rebuilds this output before staging. The package-name form requires publishing the built distribution, which this workflow does not do. Keep runtime user data separate from build output; determine concrete data paths after the Phase 2 audit. Do not emit lib/build/dist trees in source packages. Bundled private packages must not escape as unresolved runtime dependencies. Distribution uses explicit files and excludes tests, upstream references, real data and secrets. Do not run dependency lifecycle scripts unnecessarily.

## Release and installation acceptance

Before publishing, inspect the package contents from `dist/packages/dsh-lfaa`:

```sh
cd H:\ai\dsh-lfaa\dist\packages\dsh-lfaa
npm pack --dry-run --json
```

The package name must match `package.json.name` (currently `dsh-lfaa`), and the version must be the intended stable version with no `-dev` or other prerelease suffix. Confirm the tarball contains `index.mjs`, `client.js`, `cordis.patch.yml` and the bilingual documentation, and excludes tests, secrets and workspace debris. The GitHub repository name comes from its URL; the npm package name comes from `package.json.name`. Enter the npm package name in DSH's package-name install field.

After publishing, verify the official npm registry; a success line from `npm publish` alone is not acceptance evidence:

```sh
npm view dsh-lfaa version dist-tags --json --registry=https://registry.npmjs.org/
npm view dsh-lfaa@<expected-version> version --registry=https://registry.npmjs.org/
```

`latest` must point to the intended stable version, and querying that exact version must return it. If the registry reports `0.0.0-stage` or the expected version returns E404, the package is still staged or not public and must not be marked as published. Open https://www.npmjs.com/package/dsh-lfaa in the ChatGPT/Codex in-app browser and verify the public version, README and package details. If npm shows a staged package, inspect it under Staged Packages and have the package owner complete the 2FA approval, then repeat the registry checks. Never put tokens or one-time codes in documentation, logs or chat.

Check the mainland China mirror separately; an official-registry pass does not prove mirror synchronization:

```sh
npm view dsh-lfaa version dist-tags --json --registry=https://registry.npmmirror.com/
```

If the mirror has not synced, record it as pending and select the source under test explicitly in DSH. Do not mark the mirror install as passed.

Finally, verify installation and loading in the actual DSH “Add Plugin” UI. Test the relevant input modes separately: npm package name `dsh-lfaa`, GitHub URL `https://github.com/yubboo/dsh-lfaa.git`, and the local repository root (on this machine, `H:\ai\dsh-lfaa`; build first). Confirm source discovery, successful installation, appearance in the target profile, and loading after reloading or restarting DSH. Record the DSH version, source, input mode, result, and screenshot or specific error; mark untested modes explicitly. Release acceptance passes only when the artifact, target registry, and real DSH install/load checks all meet expectations.

Run `npm run build`, meaningful focused tests and `npm run check` for the affected change. Native changes need a real DSH Loader/profile test. UI changes need the actual DSH page in the built-in browser at desktop and relevant narrow/short sizes; record route, viewport, behavior and screenshots, or the specific blocker. Real AI/node operations are separate evidence and require the user's actual task scope.

Maintain documentation in English/Chinese pairs. Update architecture, extension contracts, package READMEs and validation when ownership or behavior changes. Report actual checks and untested areas, preserve unrelated files, and remove only verified task-created temporary residue. Do not commit or publish without an explicit request.
