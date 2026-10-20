# 第三阶段：Minecraft 开服开发记录

[English](phase-3-minecraft.md) | 中文

日期：2026-10-15

## 目标与本阶段边界

最终产品目标是让用户选择 Paper、Fabric、模组服务端等发行版，以及各发行版实际公开且可获取的 Minecraft 版本。版本列表必须来自发行版的实时元数据，不能依赖过时的固定版本表。

按照开发总提示词，第三阶段先完成真实服务端闭环。根据用户对职责的明确要求，本阶段把 Agent 工具接入提前到部署闭环中：模型先发现发行版/版本、检查 Java，再根据结果决定是否下载官方 JRE 和继续安装/开服。全局工作区允许用户选择 DSH 会话，并通过 Session Controller 向该会话中的 Agent 提交请求；会话视图 Tab 则直接使用框架绑定的 Session。当前实现 Paper 和 Fabric 服务端，并支持通过 Modrinth 搜索与安装 Fabric 模组；Forge、NeoForge、Quilt、混合端、模组整合包和代理服仍未实现。

## 已实现

- 新增 [dsh-lfaa-minecraft](../packages/dsh-lfaa-minecraft/README.zh.md)，由根插件装配并通过 `ctx.lfaaMinecraft` 提供 Host 领域服务。
- 版本目录读取 PaperMC Downloads Service v3，动态提供所有正式发布版本；预发布版本不进入默认稳定版选择。构建目录只提供 Paper 官方标记为 `STABLE` 的构建。
- Fabric 版本和稳定 Loader/Installer 通过 Fabric Meta API 动态发现。Fabric 官方 server-JAR endpoint 不提供发布方 SHA-256/精确大小；实现限制下载上限、验证 JAR ZIP 头并记录本地 SHA-256，明确不冒充发布方校验和验证。
- Fabric 模组按所选 Minecraft 版本从 Modrinth 搜索；Agent 展示项目 ID 与服务端兼容性。安装仅写入已停止的 Fabric 实例，递归解析必需依赖并限制深度/数量，检查可用空间、不覆盖已有文件，并校验 Modrinth 发布的 SHA-512。当前不支持模组整合包和其他模组加载器。
- 服务端下载使用 Paper 官方 URL、公布的精确大小和 SHA-256。下载先写入实例临时文件，完整性验证成功后才改名为 `server.jar`。
- Java 版本要求优先读取 Mojang 版本元数据；旧版本缺失字段时按 Paper 当前官方兼容表处理。`inspect_java` 通过 DSH subprocess 检查 PATH、`JAVA_HOME` 和常见安装目录中的 Java。若没有兼容运行时，模型可调用 `install_java`，服务从 Adoptium 官方 API 获取 Temurin JRE 的下载链接、文件大小和 SHA-256，在校验通过后用 DSH subprocess 的系统 `tar` 解压到用户选定的数据根目录，再检查安装版本。
- 新增 `minecraft_server` Agent 工具：模型分别调用版本/构建发现、Java 检查/安装、实例创建、Paper 安装和生命周期动作，并根据每步真实结果决定下一步；缺少 Java 不再只是终止错误，也不会由服务静默选择后续流程。
- 新增会话工作区操作面板，提交 Paper/Fabric 版本查询、创建/安装、状态、开停服、配置读取与修改、实例文件浏览与读取、控制台读取与单行命令、备份创建/列出/恢复和 Fabric 模组搜索/安装请求。EULA 有单独的用户勾选和确认操作；服务安装后不会自动接受或启动。
- 下载、写文件、控制台命令和服务端进程动作接入 DSH 沙箱策略与本次调用审批；拒绝或取消后立即停止，不能改用其他工具绕过。
- 创建独立 UUID 实例目录，要求调用方提供绝对本地数据根目录。数据结构为 `<dataRoot>/dsh-lfaa/minecraft/instances/<uuid>`；实例元数据、EULA 与 `server.properties` 通过 `ctx.fs` 管理。
- 创建时写入 `eula=false`。只有调用方明确传入 `accepted: true` 才记录接受状态；未接受时拒绝启动。
- 开服使用显式 Java argv，不经过 shell。使用有界的 stdout/stderr 缓冲，只有识别到 Paper `Done (...)! For help, type "help"` 才报告运行就绪。
- 提供实例列表、状态、控制台读取/单行命令、优雅停止、超时后的 DSH 受管进程终止、重启，以及插件卸载时的进程清理。
- 创建前验证名称、端口、内存、数据路径和端口占用；安装前验证磁盘可用空间、Java 版本和发行版构件元数据。

## 文件系统执行限制

DSH 当前公开 `ctx.fs` 提供路径解析、文本读写和原始字节读取，但没有目录创建或原始字节写入方法。实现因此用 Node 本地文件 API 创建实例目录并流式写入二进制 JAR；写入前检查 DSH 文件系统与 subprocess 是否映射到同一个本地路径，无法确认时会拒绝操作。文本元数据继续经 `ctx.fs` 写入。当前实现要求本地共享文件系统，不宣称支持远程或隔离的执行世界。

## 尚未完成或尚未实测

- 本机 Java 21 位于 `C:\Program Files\Java\latest\jdk-21`，不在 PATH；本次新增常见目录扫描，但尚未在 DSH Profile 中确认工具发现并实际执行该安装。
- 尚未下载 Paper、创建用户实例、运行服务器或验证端口、实时控制台和优雅停止。服务端启动需要用户通过操作面板明确接受 EULA。
- 尚未完成 DSH Profile 的实际加载、包升级后的数据保留、异常退出处理，以及操作面板在真实 DSH 会话中的 Agent 工具发现/调用/审批验收。构建成功和代码登记不等于真实环境已验收。
- Paper 和 Fabric 稳定版本由 Agent 工具动态返回；用户在会话结果中选择，再把版本填入工作区后安装，当前还没有预填充版本下拉框。Fabric 服务端尚未实机安装/启动验收，Modrinth 搜索/安装也尚未在真实 DSH Host 中验收。Forge/NeoForge、Quilt、混合端、模组整合包仍没有适配器。

因此第三阶段仍在进行，当前代码不能表述为“已完成真实开服验收”。正式进入第四阶段前，须先在实际 DSH 环境完成 Paper 版本发现、安装、用户 EULA 确认、真实就绪、控制台和停止验收。

## 官方资料

- [PaperMC Downloads Service](https://docs.papermc.io/misc/downloads-service/)：API v3、User-Agent 要求、稳定构建和下载校验字段。
- [Fabric Meta API](https://meta.fabricmc.net/)：官方版本、loader/installer 与服务端启动 JAR 接口。
- [Modrinth API：搜索项目](https://docs.modrinth.com/api/operations/searchprojects/)与[查询项目版本](https://docs.modrinth.com/api/operations/getprojectversions/)：按版本查找 Fabric 模组并获取下载元数据。
- [PaperMC Getting Started](https://docs.papermc.io/paper/getting-started/)：发行版适用 Java 版本与运行方式。
- [Mojang 版本清单](https://piston-meta.mojang.com/mc/game/version_manifest_v2.json)：各 Minecraft 版本元数据入口。
- [Adoptium API Cookbook](https://github.com/adoptium/api.adoptium.net/blob/main/docs/cookbook.adoc)：官方 Java 版本化下载 URL、发行资产元数据与 SHA-256 校验示例。
