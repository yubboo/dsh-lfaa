# 当前验证记录

[English](validation.md) | 中文

本项目目标是完整 DSH 插件；当前源码包含原生界面、外观模块、全局工作区会话选择器，以及 Paper/Fabric Minecraft Host/Agent 能力（包括 Fabric 模组发现和安装）。工作区通过选定的 DSH 会话提交操作；真实 Agent 发现、审批和服务端操作仍未在实际 DSH Profile 验收。

用户已报告 dsh-lfaa@0.1.0 可通过包名安装并由 DSH 显示安装成功；该入口尚未在本轮独立重放验证。GitHub 和本地目录安装、Agent 工具注册、Java 版本发现/下载、Paper 实际安装、用户接受 EULA 后的真实开服均未验收。后续结果按入口和业务闭环分别登记。

本轮构建了 `dsh-lfaa@0.1.2`；`npm pack --dry-run --json` 列出预期的 14 个发行文件。本机 `web` Profile 现在指向已构建的 `0.1.2` 目录；更新时 DSH Web 服务仍在运行，因此尚未让运行中的页面重新加载该包。用户截图显示插件行已选中，但中间面板为空；Windows 浏览器检查助手因无法可靠确认当前 URL 而停止。实际浏览器、Loader 和开服验收仍待完成。本轮未运行测试套件。

2026-10-20，用户反馈在 DSH 0.2.1-rc.2 中 npm 包名和 GitHub 两种安装均失败。npm 截图给出了明确原因：已发布的 `dsh-lfaa@0.1.2` 要求 DSH 包版本为 `0.2.1-alpha.3`，而当前宿主为 `0.2.1-rc.2`。GitHub 失败详情处于折叠状态，尚未单独取得其具体错误。现已将源码清单和 Git 根安装入口对齐 rc.2 的 DSH 包，调整 Cordis/Schemastery 兼容范围，补齐 Client Session peer/注入声明，并将包版本升至 0.1.3。`pnpm install --lockfile-only`、离线 frozen-lockfile 安装和 `pnpm run build` 通过。发行清单有 17 个 peers，所有 DSH peer 均匹配 rc.2，不再含旧 prerelease peer，根安装入口与发行包清单一致。`npm pack --dry-run --json` 显示 `dsh-lfaa@0.1.3` 和预期的 14 个文件。`pnpm run check` 被既有的 `docs/development-master-prompt.zh.md` 行尾空白阻断；未运行测试套件，也未在 DSH 中实际安装/加载。实际发布/推送前，npm 已发布包和 GitHub 远端 `main` 仍不会改变。
