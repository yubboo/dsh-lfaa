# dsh-lfaa-workspace

[English](README.md) | 中文

私有 Browser 包，负责左侧导航、中间主面板/会话Tab、右侧辅助栏、设置分区，以及文案、局部样式和局部交互。身份/配置来自注入的 DSH 服务和框架 hook；组件不持有 ctx，也不保存另一份会话历史。

消费 dsh-lfaa-appearance 和宿主共享 React/原语；工作区与设置页共享 ConfigForm，如实显示拒绝、错误及只读状态。注册、样式、设置/系统订阅和视觉层随生命周期撤销；容器断点适配主面板、会话、设置与窄栏，原生 Modal 保持焦点键盘 Owner。根脚本构建，真实浏览器/Loader 与夹具验证分别记录。
