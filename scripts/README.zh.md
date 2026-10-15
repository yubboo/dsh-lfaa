# 工程脚本

[English](README.md) | 中文

- build.mjs：Host/Browser 独立打包，生成 DSH 模块登记，组装到根 dist/packages/dsh-lfaa；源码包不写构建输出。
- check-workspace.mjs：校验 dsh- 命名、私有包依赖、中英文文档、发行导出和本地文档链接；结构通过不代表运行兼容。

构建不隐式安装到用户 Profile 或改变真实数据。
