# dsh-lfaa

[English](README.md) | 中文

对外装配包，拥有元数据、Bundle 和 Host 入口，导出 appearance 的唯一 Config；不复制 UI/业务规则，不另建 AI/Session 服务。Host 身份、设置及权限由 DSH 管理。

源码清单描述发行导出，根构建在 dist/packages/dsh-lfaa 生成 index.mjs、client.js 与移除私有依赖后的清单。安装该产物，不安装此源码目录。具体能力和验证见根文档；清单存在不代表 Loader 已激活。
