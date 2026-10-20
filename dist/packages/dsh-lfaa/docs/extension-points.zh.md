# 原生扩展协议

[English](extension-points.md) | 中文

| 区域 | DSH 接口 | 插件义务 |
|---|---|---|
| 左侧菜单 | sidebar.panellist + layout.selectPanel | 保留宿主导航，插件 id 选择自己的 main 面板。 |
| 中间工作区 | keyed main + 全局 `useSessions` hook | 全局面板列出 DSH 会话；Agent 操作前必须选择目标会话。 |
| 小说工作区 | `remote.account` + `sessions.using`/Session events | 先验证 DSH 账号资料 ID，再打开该账号的本地 IndexedDB；润色/续写经选定 Session 执行，结果须由用户确认后应用。 |
| 会话/轨迹 Tab | list conversation.view | 增加 dsh-lfaa Tab，身份来自框架 props；保留原历史、视图选择与轨迹的开发者设置。 |
| 右侧菜单 | sidebarRightTabs + sidebar.right.pane.tab/title + openTab | 类型、正文和标题配套登记；属于当前上屏 Session，全局面板不等同会话面板。 |
| 设置中心 | settings.section + ConfigForms | 工作区消费同一校验后的配置和带 revision 的保存链；不可用、只读或写入拒绝如实显示。 |
| Minecraft Host 领域 | `ctx.lfaaMinecraft`，由 dsh-lfaa-minecraft 提供 | 提供 Paper/Fabric 版本与构建发现、Java 检查/安装、实例、EULA、开停服、受限文件/配置、控制台、备份及 Fabric 模组；工作区将请求发送到选定 DSH 会话中的 `minecraft_server` Agent 工具。 |

DSH 工具参数根是隐式开放属性映射；显式嵌套 object 必须声明布尔值 `additionalProperties`。Minecraft `server.properties` 映射在 Schema 边界保持开放，Host 领域 Owner 继续校验允许的键、字符串值及请求数量范围。

登记均可撤销，slots.inject 等待插槽声明；覆盖原组件时保持 props/children/store/scope 合同，shadow 优先级数值低者呈现，同优先级冲突报错。不扫描私有 DOM 或匹配散列类名。

主题经 theme.overrideTokens 叠加，浅/深模式值成对且以稳定插件来源管理；native 默认不加覆盖层。density 只影响插件工作区，系统减少动态效果优先；不为高频键盘操作额外增加动画。

Host/Client 分离构建，浏览器使用上游 ModuleLoader 协议及共享平台模块。原生 Modal 保留焦点、键盘及关闭行为；公开令牌不代表存在通用弹窗替换工厂，更深行为必须有真实公开接口及回归。

当前支持的包基线为 DSH 0.2.1-rc.2，peer 版本精确对齐；仍须在已安装运行时验证作用域、导出、卸载、设置往返和真实浏览器行为，才能声称完整兼容。结果见[验证记录](validation.zh.md)。
