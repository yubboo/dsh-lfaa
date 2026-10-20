# dsh-lfaa-minecraft

由 DSH-LFAA 拥有的 Minecraft Host 领域包。当前适配 Paper 与 Fabric：Paper 从 PaperMC 官方接口动态发现版本和稳定构建，并按官方 SHA-256 校验服务端文件；Fabric 从 Fabric Meta 动态发现正式 Minecraft 版本、稳定 Loader/Installer，并通过官方服务端 JAR endpoint 获取启动文件。Fabric endpoint 不公布预期大小或发布方 SHA-256；插件限制下载大小、检查 JAR 格式并记录实际下载散列，不能声称通过发布方校验和。两种发行版均从 Mojang 元数据读取 Java 要求，缺少兼容版本时可通过 Adoptium 官方 API 下载并校验 Temurin JRE。包提供 DSH Agent 的 `minecraft_server` 工具，由模型根据每次调用结果决定下一步。

每次操作由调用方提供绝对可写数据根目录。实例文件位于该目录下的 `dsh-lfaa/minecraft/instances/<id>`，插件安装的 Java 运行时位于 `dsh-lfaa/minecraft/runtimes/`。缺少兼容 Java 时，模型可以先调用 `inspect_java`，再按返回结果调用 `install_java`；服务只接受 Adoptium 官方发行信息及 Temurin GitHub 发行附件，并在解压前验证 SHA-256。调用方明确接受 Minecraft EULA 前，服务拒绝启动。

模型通过 `minecraft_server` 依序执行发行版版本/构建发现、Java 检查/安装、实例创建、服务端安装和生命周期操作。安装与启动分别执行，模型需检查结果后决定下一步。下载、写入、控制台命令和进程操作遵循 DSH 沙箱策略；拒绝或取消审批后必须停止。Paper/Fabric 的会话操作面板已连接到当前 DSH Session；Fabric 模组可通过 Modrinth 按版本搜索，并在服务端停止时连同必需依赖安装且校验 SHA-512。真实 DSH Profile 下的注册、调用与权限表现仍待实测；模组整合包和 Forge/NeoForge 等发行版尚未接入。
