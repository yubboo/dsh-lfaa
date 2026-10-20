# 完整插件架构与 DSH 接入协议

[English](architecture.md) | 中文

## 包结构与运行边界

| 包 | 唯一职责 | 运行位置与依赖 |
|---|---|---|
| dsh-lfaa | 对外清单、Bundle、Host 装配与配置导出 | Host；构建内联实现包，不复制业务规则。 |
| dsh-lfaa-workspace | 左侧导航、可选择 DSH 会话的中间主面板、会话Tab、Minecraft 操作、右侧辅助栏、设置页、文案与局部样式 | Browser；依赖宿主 Slots/Locale/Layout/ConfigForms/Sidebar/Session hooks、共享 React/原语与 appearance。 |
| dsh-lfaa-appearance | 唯一配置 schema 与可撤销的主题/动效投影 | Host schema 与隔离的浏览器投影；不拥有导航、AI 或数据库。 |
| dsh-lfaa-minecraft | Paper/Fabric 动态目录、Fabric 模组发现、实例元数据、校验安装、Java 运行时与服务端进程生命周期 | Host；使用 `ctx.fs`、`ctx.subprocess` 与 `minecraft_server` Agent 工具。工作区通过选定的 DSH 会话提交请求，不另建 Remote 执行通道。 |

源码目录、manifest 名称统一 dsh- 前缀，跨包使用公开包名导入。根 scripts 编排构建，tests 存长期回归；私有实现内联到 dist/packages/dsh-lfaa 的一个可安装插件，发行清单移除私有工作区依赖。仓库根是该产物的安装入口：本地安装前需要先构建，GitHub 安装使用已提交的发行目录且不运行构建生命周期脚本；GitHub 推送菜单会在暂存前重建该目录。源码包目录仍仅用于开发。

## 已确认的定位

dsh-lfaa 是全新完整 DSH 插件，有自己的业务模块；外观与布局是其中一组业务，不将整个项目定义为皮肤。不参考、复制或迁移旧 LFAA 的设计、代码、业务、账户或数据。除目前明确的界面体验模块外，其他业务按后续明确需求定义，不创造假功能或占位成功。

DSH 统一掌管全部 AI、模型、Agent/子 Agent、工具调度、会话和 AI 数据、账号及操作审批。插件没有自己的 Harness、Provider 请求、登录或 AI 历史库。所有领域授权、对象归属、参数和并发校验必须由实际业务 Owner 执行，不能把权限审批当成数据验证。

## 五个原生区域

| 用户区域 | 真实扩展点 | 当前接入与边界 |
|---|---|---|
| 左侧菜单 | `sidebar.panellist`，id=dsh-lfaa；`layout.selectPanel()` | 自己的业务入口，保留宿主导航。 |
| 中间工作区 | keyed `main`，key=dsh-lfaa | 全局业务工作页通过 DSH 公开会话列表让用户选择 Agent 操作目标；返回会话不创建第二会话。 |
| 中间会话/轨迹 Tab | list `conversation.view`，id=dsh-lfaa | 在原会话/轨迹旁增加 Session-bound 工作区，Session ID 来自框架标准 props。不替换 chat/trajectory，不伪造活动或重放消息。轨迹是否显示仍受宿主设置控制，插件不擅自打开开发者功能。 |
| 右侧菜单 | `sidebarRightTabs` 类型登记 + keyed `sidebar.right.pane.tab` / `.title`；`sidebarRight.openTab()` | 内容属于宿主对应 Session；当前只读显示真实偏好并链接工作页。需要当前会话已在屏幕上，不能把全局面板等同于右栏会话。 |
| 设置中心 | list `settings.section` + `ConfigForms` | 工作页、Session 工作区、右栏和设置分区共享 Host schema 接受后的同一配置，不另建 LocalStorage 镜像。 |

每个注册通过 Cordis effect 或 Slots 生命周期释放；主体不改 DSH 源文件。未声明的子插槽不能渲染，不以 DOM 扫描/散列类名覆盖宿主。根入口只装配，业务规则由独立模块拥有，不先造万能业务注册表或新的内核。

## 外观与交互

视觉围绕 DSH 现有三栏、会话和原生控制设计；插件主区域采用工作页而非重复整个应用。预览明确标注，不假造业务运行数据。共享 CSS 令牌以 `theme.overrideTokens` 建立可撤销层，浅/深主题值成对，默认不更改字体、字号、品牌色和用户主题选择。

原生 Modal 继续负责焦点、键盘、Esc 和遮罩关闭。只对公开且实际消费的令牌调整边角、阴影与过渡；弹窗退场仍受宿主组件生命周期控制。没有公共全局工厂，不能宣称插件可以无条件重做所有弹窗动画。需要更深替换时，验证实际功能插槽、其 props/children/store/scope 合同；Slots 支持按优先级覆盖，卸载应恢复原贡献，而非修改上游实现。

高频键盘操作不另加动画；预览弹窗的轻淡进入使用原宿主行为，配置只调整实际消费的过渡时长与曲线。系统或用户选择减少动态效果时优先减少，监听和主题层卸载清理。没有新增轮询、DOM 观察器、持续动画帧或无界消息缓存。

布局使用 Grid/Flex 与容器断点，适配主面板、会话 Tab、设置页和窄右栏。短屏保持内容滚动、弹窗操作可达；渲染只订阅框架绑定的配置 hook，不在组件内手动订阅外部数据。UI 文案使用宿主 locale 字典。

## 设置和数据

Config 定义于 packages/dsh-lfaa-appearance/src/config.mjs，由 dsh-lfaa Host 导出，默认 enabled=true、preset=native、density=comfortable、motion=system。服务端 schema 验证并由 DSH Settings 保存到当前 Profile，Client 从 ConfigForms 读取；来源未 ready 或只读时禁用写入，失败/拒绝不伪装成功。

这些是 Profile 级体验配置，不等于按账号的业务数据。业务开始需要持久化时，使用 Host 确认的真实账号命名空间；不把 Profile、Session 或匿名遥测 ID 当作账户。切号、撤销身份、在途操作和旧缓存必须随业务验收。插件安装不自动复制任何用户数据。

## 上游兼容基线

当前支持的 DSH 包基线为官方 `dsh-v0.2.1-rc.2`（[源码标签](https://github.com/deepseek-ai/deepseek-harness/tree/dsh-v0.2.1-rc.2)，发布提交 `687f282`）。所有声明的 DSH peer 均精确锁定到 `0.2.1-rc.2`，使安装器的 peer 检查与该运行时一致。源码导出、发行包和实际运行中的安装仍需分别核对；peer 版本匹配本身不代表完整运行兼容。见[验证记录](validation.zh.md)。不 fork 上游源码，也不使用隐藏旧宿主回退。

当前 peer 版本精确限定为 `0.2.1-rc.2`；真实 Loader、浏览器、设置往返、卸载恢复的结果见验证记录，未测试项不能记为通过。升级先对账公开导出、Bundle/Client 模块协议、Slots/Theme/ConfigForms 和当前 Session 生命周期，再跑直接回归及实页测试；不使用版本豁免或静默回退代替适配。

源码核查依据是上游 packages/client/{ui-layout,ui-conversation,ui-sidebar-right,ui-settings,ui-theme,ui-slots,ui-primitives,ui-session} 的公开服务/插槽合同及 docs/user/develop/basic/publish.zh.md。Minecraft 阶段三进度和限制见[阶段记录](phase-3-minecraft.zh.md)：Paper/Fabric Host 工具与工作区入口已接入；Forge/NeoForge/Quilt、模组整合包、代理服和真实开服验收尚未完成。
