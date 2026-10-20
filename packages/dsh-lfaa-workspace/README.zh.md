# dsh-lfaa-workspace

[English](README.md) | 中文

私有 Browser 包，负责左侧导航、三栏小说工作区、中间会话Tab、右侧辅助栏、设置分区，以及文案、局部样式和局部交互。写作区支持小说项目与章节管理、自动保存章节正文，以及通过 AI 润色/续写并由用户确认后应用建议。身份/配置来自注入的 DSH 服务和框架 hook；组件不持有 ctx，也不保存另一份会话历史。

全局工作区使用公开的 `useSessions` hook 列出 DSH 会话。Minecraft 请求和写作提示都使用选定的 DSH 会话；会话内 Tab 则直接使用框架绑定的当前会话。写作提示经 DSH Session Controller 提交，建议从该 Session 的真实事件读取，只有用户明确点击后才写回正文。面板不另建模型/工具通道，也不复制会话历史。

小说及章节保存在浏览器 IndexedDB，数据库按 DSH 账号资料中经过验证的账号 ID 隔离；账号切换时卸载当前编辑器。本地数据仅在当前浏览器配置中可用，不会跨设备或 DSH 主机同步；插件不把 Profile 或 Session ID 冒充账号身份。

消费 dsh-lfaa-appearance 和宿主共享 React/原语；工作区与设置页共享 ConfigForm，如实显示拒绝、错误及只读状态。注册、样式、设置/系统订阅和视觉层随生命周期撤销；容器断点适配主面板、会话、设置与窄栏，原生 Modal 保持焦点键盘 Owner。根脚本构建，真实浏览器/Loader 与夹具验证分别记录。
