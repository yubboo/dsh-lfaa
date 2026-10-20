# dsh-lfaa

[English](README.md) | 中文

**dsh-lfaa 是一个完整的 DSH 原生插件项目，拥有自己的业务模块。外观、布局、弹窗、卡片和动效是其中一组能力，不是整个项目的类型。**

项目从头设计，围绕 DSH 原生工作台，不参考或迁移旧 LFAA。DSH 是唯一主 Harness，统一提供账号、AI、会话、模型、子 Agent、工具调度与操作审批；本项目通过公开接口贡献自己的业务和呈现。业务需要存储时保存在本地，并以可信 Host 身份隔离，不复制 AI 历史或维护另一套登录。

三栏写作工作区支持小说项目和章节管理、自动保存正文，并通过选定的 DSH 会话请求 AI 润色/续写。结果先以建议呈现，用户确认后才写入；作品按 DSH 可信账号资料 ID 保存在本地。

## 项目结构

```text
packages/
  dsh-lfaa/              插件装配与发行清单
  dsh-lfaa-workspace/    小说工作区、编辑器、会话Tab、右侧面板、设置中心
  dsh-lfaa-appearance/   外观配置与可撤销主题/动效投影
  dsh-lfaa-minecraft/   Host 侧 Paper/Fabric 实例、生命周期与 Modrinth Fabric 模组
scripts/                 构建与结构检查
tests/                   定向回归
docs/                    中英文架构、扩展合同与验证
dist/                    仅生成产物，受忽略
```

包目录和 package.json 名称统一使用 dsh- 前缀。实现包在构建时合并进一个可安装的 dsh-lfaa，不要求用户安装开发工作区。规则见 [AGENTS.zh.md](AGENTS.zh.md)，[开发规范](开发规范.md)，文档入口见 [docs](docs/README.zh.md)。

## 原生区域

| 区域 | 插件贡献 |
|---|---|
| 左侧菜单 | `dsh-lfaa 工作区` 入口，沿宿主导航选择自己的 main 面板。 |
| 中间工作区 | 三栏小说/章节/正文编辑器，及原有界面体验控制；写作 AI 通过选定的 DSH 会话工作。 |
| 中间 Tab | 在会话/轨迹旁贡献 dsh-lfaa Session 工作区，保留 DSH 原会话与轨迹；不另存消息。 |
| 右侧菜单 | 注册自己的 tab 类型及面板，关联所属 DSH Session，显示当前偏好与辅助入口。 |
| 设置中心 | 注册 dsh-lfaa 设置分区，和工作页共享同一 ConfigForm。 |

Minecraft 当前实现 Paper 与 Fabric Host 服务和 Agent 工具，并在会话工作区加入操作面板：可请求查询发行版/版本、创建安装、检查状态、启动/停止、读写配置、浏览/读取文件、控制台命令以及备份/恢复。Paper 版本来自 PaperMC；Fabric 版本、稳定 Loader/Installer 与服务端启动 JAR 来自 Fabric Meta。面板把操作明确提交到当前 DSH 会话；Java 检测与必要时官方 Temurin 安装由 Agent 按工具结果决定，写入、下载和进程操作仍受 DSH 审批约束。EULA 必须由用户主动勾选确认。Fabric 还可按 Minecraft 版本搜索 Modrinth 模组，并在服务端停止时安装选中模组及其必需依赖；模组文件按 Modrinth SHA-512 校验。模组整合包、Forge、NeoForge 和真实 DSH Profile 下的端到端验收尚未完成。Fabric 服务端文件由官方 HTTPS 接口生成；该接口未提供与 Paper 相同的 SHA-256 元数据，因此本地记录下载后的散列并检查 JAR 格式，但不能称为发布方校验和验证。

## 开发

Node.js 版本由 package.json 声明。安装开发依赖时不要自动装入第二份宿主 peer：

```powershell
pnpm install
pnpm run build
pnpm test
pnpm run check
```

仓库根目录现在也是 DSH 安装入口：根清单指向已提交的 `dist/packages/dsh-lfaa` 发行目录，GitHub 安装无需执行构建生命周期脚本。在 DSH「添加插件」中输入 `https://github.com/yubboo/dsh-lfaa.git` 可从 Git 安装；本地安装前先在仓库根运行 `pnpm run build`，再输入仓库根目录。GitHub 推送菜单会在暂存前重建可安装发行目录。构建只输出根 `dist/packages/dsh-lfaa`；Host 与 Browser 入口分离，浏览器通过 DSH 的 ModuleLoader 登记并使用宿主共享 React/原语。发行清单移除已内联的私有包依赖，白名单排除参考源码、测试环境和真实数据。包名 `dsh-lfaa` 需要先将构建产物发布到 npm 才能安装。Windows 下可在仓库根双击 `publish-npm.bat` 打开菜单：菜单 6 安全推送到 GitHub `main`，提交说明必须以递增的三段版本号开头；脚本从 GitHub 提交历史读取上次推送版本，并用本地 Git 配置作为备用。菜单 7 检查、构建、预览并在确认后发布 npm；菜单 1–5 提供构建、登录和版本查询。中文菜单由 `scripts/publish-menu.ps1` 显示，`.bat` 保持纯 ASCII，避免 CMD 把 UTF-8 字符误当成命令。脚本不会自动递增 npm 包版本。

安装到一个明确的 DSH Profile 可使用官方 `dsh plugin --profile <name> add <仓库根目录或dist/packages/dsh-lfaa目录>`。本地仓库根必须先构建；GitHub 安装使用仓库中已提交的发行目录，不会在安装时构建。安装、启用、停用及宿主兼容的真实验证状态以验证记录为准，不使用版本豁免冒充兼容。

## 设置

Host entry ID 为 `dsh-lfaa`。DSH Config schema 验证并持久化 Profile 级设置，工作区/会话 Tab/右栏/设置分区经同一 ConfigForms 读取：

| 配置 | 默认值 | 消费 |
|---|---|---|
| enabled | true | 关闭时撤销体验层，恢复宿主下层主题。 |
| preset | native | native 保留 DSH；soft/crisp 调整实际消费共享令牌的卡片/弹窗圆角、浮层与阴影。 |
| density | comfortable | 本插件工作区留白与控制密度；不伪称修改整个 DSH 的布局几何。 |
| motion | system | 跟随系统或主动减少效果；系统减少动态效果优先，监听可撤销。 |

默认不改宿主颜色、字体、字号或主题选择。只读或设置不可用时不允许写入；配置拒绝/失败显示真实结果。外观方案不意味着所有 DSH 弹窗或卡片都支持替换；覆盖范围由实际公共令牌/插槽决定。
