# Validation record

English | [中文](validation.zh.md)

The product goal is a complete DSH plugin. Current source includes native surfaces, appearance controls, a global workspace conversation picker, and Paper/Fabric Minecraft Host/Agent capabilities including Fabric mod discovery/install. The workspace submits operations through the selected DSH conversation; real Agent discovery, approval and server operations have not been exercised in a live DSH Profile.

The user reported that dsh-lfaa@0.1.0 installed by package name and DSH displayed a successful install; this route was not independently replayed this turn. GitHub and local-directory installs, Agent tool registration, Java discovery/download, Paper installation, and a real server start after explicit EULA acceptance remain unverified. Record each installation route and business loop separately.

This turn built `dsh-lfaa@0.1.2` and `npm pack --dry-run --json` listed the expected 14 distribution files. The local `web` Profile dependency now points to the built `0.1.2` directory. Its DSH web service was still running during the update, so the running page was not reloaded against the new package. The user-provided screenshot shows the plugin row selected with an empty central panel; the Windows browser inspection helper stopped because it could not confidently determine the current URL. Browser, Loader and real server acceptance remain pending. No test suite was run.
