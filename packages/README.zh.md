# 包职责

[English](README.md) | 中文

- [dsh-lfaa](dsh-lfaa/README.zh.md)：对外插件装配与发行。
- [dsh-lfaa-workspace](dsh-lfaa-workspace/README.zh.md)：原生工作区区域及中英文 UI。
- [dsh-lfaa-appearance](dsh-lfaa-appearance/README.zh.md)：外观配置与可撤销呈现。
- [dsh-lfaa-minecraft](dsh-lfaa-minecraft/README.zh.md)：Paper/Fabric Host 领域服务，负责动态版本发现、Java 管理、校验下载、Fabric 模组和服务器生命周期。

目录与 manifest 名称统一 dsh- 前缀且一致。私有实现包有真实消费者，构建内联，不增加用户安装负担。产物只写根 dist。
