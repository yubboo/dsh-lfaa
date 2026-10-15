# Scripts

English | [中文](README.zh.md)

- build.mjs: independently bundle Host/Browser, emit the DSH module registration and stage the public plugin under root dist/packages/dsh-lfaa. Never build into source packages.
- check-workspace.mjs: verify dsh- naming, declared private package references, bilingual documentation, distribution exports and local documentation links. It is a structural gate, not runtime compatibility proof.

Runtime installation and real user-data changes are not implicit build steps.
