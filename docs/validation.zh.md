# 当前验证记录

[English](validation.md) | 中文

本项目目标是完整 DSH 插件；当前源码包含原生界面、外观模块、全局工作区会话选择器，以及 Paper/Fabric Minecraft Host/Agent 能力（包括 Fabric 模组发现和安装）。工作区通过选定的 DSH 会话提交操作；真实 Agent 发现、审批和服务端操作仍未在实际 DSH Profile 验收。

用户已报告 dsh-lfaa@0.1.0 可通过包名安装并由 DSH 显示安装成功；该入口尚未在本轮独立重放验证。GitHub 和本地目录安装、Agent 工具注册、Java 版本发现/下载、Paper 实际安装、用户接受 EULA 后的真实开服均未验收。后续结果按入口和业务闭环分别登记。

本轮构建了 `dsh-lfaa@0.1.2`；`npm pack --dry-run --json` 列出预期的 14 个发行文件。本机 `web` Profile 现在指向已构建的 `0.1.2` 目录；更新时 DSH Web 服务仍在运行，因此尚未让运行中的页面重新加载该包。用户截图显示插件行已选中，但中间面板为空；Windows 浏览器检查助手因无法可靠确认当前 URL 而停止。实际浏览器、Loader 和开服验收仍待完成。本轮未运行测试套件。
