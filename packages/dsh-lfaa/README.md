# dsh-lfaa

English | [中文](README.zh.md)

Public composition package. Owns package metadata, bundle patch and Host entry; re-exports the appearance-owned Config. Business/UI rules stay in their owners. Host execution uses DSH identity, settings and permissions; no AI/session service is duplicated.

The source manifest describes distribution exports. Root build generates index.mjs, client.js and a rewritten manifest in dist/packages/dsh-lfaa, inlining private dependencies. Install the built directory, not this source directory. Current contributions and validation are documented at the repository root; a manifest is not proof of Loader activation.
