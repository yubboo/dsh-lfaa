# Tests

English | [中文](README.zh.md)

Focused Node tests verify native surface registration, shared accepted configuration, theme/reduced-motion semantics, unchanged-update suppression and teardown. Registration fixtures explicitly simulate public services; they do not prove a DSH application loaded the plugin.

Build first, then run npm test. Loader/Profile and built-in-browser acceptance are recorded separately in docs/validation.md. Tests never create real accounts, model requests or node operations and are excluded from distribution.
