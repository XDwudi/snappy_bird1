# Snappy Bird · 微信小游戏工程底座

当前版本：**0.1.0 / 开发准备阶段**。项目名为暂用名，不代表已决定做飞鸟玩法。
默认目标是**微信小游戏**（`compileType: game`），不是普通小程序中的 WXML 页面。
目前仅实现工程启动验证页，没有玩法、联网、广告或支付。

## 快速开始

推荐 Node.js 24（见 `.nvmrc`）和 npm；依赖版本由 `package-lock.json` 锁定。

```sh
npm ci
npm run verify
npm run dev
```

在微信开发者工具中导入 **`dist/`**，项目类型选择小游戏。默认配置使用 `touristappid`，
游客模式是否可用以当前开发者工具为准；预览、真机和上传应配置自己的小游戏 AppID。
成功启动后显示「工程骨架已就绪」，轻触后显示「触摸输入正常」。
`dev` 监听 TypeScript；配置或仅素材变更后需重新构建。

配置真实账号和实际测试的基础库版本：

```sh
npm run configure:wechat -- --appid <你的小游戏AppID> --lib-version <已测试的x.y.z版本>
npm run build
```

尖括号是说明占位，执行时替换整段。详见 [微信接入](docs/WECHAT.md)。

## 工程导航

| 入口                                           | 内容                             |
| ---------------------------------------------- | -------------------------------- |
| [AGENTS.md](AGENTS.md)                         | agent 每次接手必读的工作规则     |
| [架构设计](docs/ARCHITECTURE.md)               | 模块边界、依赖方向和扩展路径     |
| [技术决策 ADR-001](docs/adr/001-foundation.md) | 平台、引擎和工具链选择及适用边界 |
| [Agent 工作流程](docs/AGENT_WORKFLOW.md)       | 任务拆分、角色、验证、评审与交接 |
| [项目计划](docs/PROJECT_PLAN.md)               | 里程碑、优先级、准备条件和风险   |
| [任务看板](docs/tasks/BOARD.md)                | 当前进度与下一项可执行任务       |
| [版本管理](docs/VERSION_CONTROL.md)            | 分支、提交、版本、远端与回退     |
| [测试策略](docs/TESTING.md)                    | 自动化与真机验收边界             |
| [发布流程](docs/RELEASE.md)                    | 从候选构建到微信正式发布         |
| [产品需求草稿](docs/PRODUCT_BRIEF.md)          | 开发玩法前需要确定的设计问题     |

## 常用命令

| 命令                                  | 作用                                           |
| ------------------------------------- | ---------------------------------------------- |
| `npm run verify`                      | 格式、类型、架构、单测、构建、包检查、产物冒烟 |
| `npm run dev`                         | 开发构建并监听 TypeScript                      |
| `npm run build`                       | 一次开发构建                                   |
| `npm run build:release`               | 压缩构建，要求真实 AppID 和固定基础库          |
| `node scripts/check-dist.mjs`         | 检查当前产物、源码映射和内部体积预算           |
| `node --test tests/package.smoke.mjs` | 在无 DOM 的模拟微信环境验证当前产物            |
| `npm run format`                      | 格式化源码和文档                               |
| `npm run hooks:install`               | 为当前仓库启用提交前与提交信息检查             |

## 当前验证边界

Node 测试及模拟 `wx` 的冒烟不能替代微信开发者工具和 iOS / Android 真机验收。
未配置远端仓库，GitHub Actions 配置已提供，但只有推送后才会运行；
账号接入、保护分支和微信发布均没有执行。具体记录见 [任务看板](docs/tasks/BOARD.md)。
