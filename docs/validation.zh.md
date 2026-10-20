# 当前验证记录

[English](validation.md) | 中文

本项目目标是完整 DSH 插件；当前源码包含原生界面、外观模块、全局工作区会话选择器，以及 Paper/Fabric Minecraft Host/Agent 能力（包括 Fabric 模组发现和安装）。工作区通过选定的 DSH 会话提交操作；真实 Agent 发现、审批和服务端操作仍未在实际 DSH Profile 验收。

用户已报告 dsh-lfaa@0.1.0 可通过包名安装并由 DSH 显示安装成功；该入口尚未在本轮独立重放验证。GitHub 和本地目录安装、Agent 工具注册、Java 版本发现/下载、Paper 实际安装、用户接受 EULA 后的真实开服均未验收。后续结果按入口和业务闭环分别登记。

本轮构建了 `dsh-lfaa@0.1.2`；`npm pack --dry-run --json` 列出预期的 14 个发行文件。本机 `web` Profile 现在指向已构建的 `0.1.2` 目录；更新时 DSH Web 服务仍在运行，因此尚未让运行中的页面重新加载该包。用户截图显示插件行已选中，但中间面板为空；Windows 浏览器检查助手因无法可靠确认当前 URL 而停止。实际浏览器、Loader 和开服验收仍待完成。本轮未运行测试套件。

2026-10-20，用户反馈在 DSH 0.2.1-rc.2 中 npm 包名和 GitHub 两种安装均失败。npm 截图给出了明确原因：已发布的 `dsh-lfaa@0.1.2` 要求 DSH 包版本为 `0.2.1-alpha.3`，而当前宿主为 `0.2.1-rc.2`。当时 GitHub 失败详情处于折叠状态。随后源码清单和 Git 根安装入口对齐 rc.2 的 DSH 包、兼容 Cordis/Schemastery 范围，并补齐 Client Session peer/注入声明，包版本升至 0.1.3。`pnpm install --lockfile-only`、离线 frozen-lockfile 安装和 `pnpm run build` 通过。发行清单有 17 个 peers，所有 DSH peer 均匹配 rc.2，不再含旧 prerelease peer，根安装入口与发行包清单一致。`npm pack --dry-run --json` 显示 `dsh-lfaa@0.1.3` 和预期的 14 个文件。`pnpm run check` 被既有的 `docs/development-master-prompt.zh.md` 行尾空白阻断；未运行测试套件，也未在 DSH 中实际安装/加载。之后用户已推送该兼容性更新；所给 GitHub 截图显示最新提交为 `0f0763b`（`0.0.2`）。

随后用户推送了 GitHub 安装修复，并确认通过 GitHub 成功安装 `dsh-lfaa@0.1.3`。启用插件时失败，错误为 `JsonSchemaError: unsupported JSON schema: parameters.properties.additionalProperties must be explicitly true or false`。已使用本机 `@deepseek-ai/dsh-tools@0.2.1-rc.2` 复现：Minecraft `server.properties` 映射把 `additionalProperties` 写成了 Schema 对象，而此 DSH 版本要求显式嵌套对象的该字段为布尔值。现改为 `additionalProperties: true`；Minecraft Host 领域 Owner 仍负责校验允许的键、字符串值及 1–20 项数量限制。定向回归（`node --test tests/minecraft-tool-schema.test.mjs`）、`pnpm run build`、`npm pack --dry-run --json`（预期 14 个文件）及 `git diff --check` 均通过。此 Schema 修复尚未推送，也尚未在用户的 DSH Profile 重新启用验证；需先更新/重装 GitHub 包，再启用。
