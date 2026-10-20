# dsh-lfaa

[English](README.md) | 中文

对外装配包，拥有元数据、Bundle 和 Host 入口，导出 appearance 的唯一 Config，并装配 dsh-lfaa-minecraft Host 领域服务；不复制 UI/业务规则，不另建 AI/Session 服务。Host 身份、设置及权限由 DSH 管理。

Web 工作区提供 Paper 与 Fabric 服务端流程。选择一个 DSH 会话后，可以请求该会话中的 Agent 查询发行版和 Minecraft 版本、检查兼容的 Java 并在需要时安装 Temurin、创建服务器实例；之后可查看状态、启动/停止、处理 EULA、读写白名单范围内的 `server.properties`、查看控制台、管理备份与恢复。Fabric 还支持通过 Modrinth 搜索和安装模组。Agent 通过 `minecraft_server` 工具执行操作，DSH 的审批和本地权限策略仍然生效；版本发现结果会回到所选会话，选择后填入版本字段再安装。

源码清单描述发行导出，根构建在 dist/packages/dsh-lfaa 生成 index.mjs、client.js 与移除私有依赖后的清单。仓库根会将该构建产物暴露给 DSH：本地安装仓库根前先构建，Git 安装则由 prepare 自动构建。此源码包目录仅用于开发。具体能力和验证见根文档；清单存在不代表 Loader 已激活。
