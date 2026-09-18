# 风羽远征 · Snappy Bird

**v0.2.0 首轮试玩版**：Flappy 拍翅 + 自动战斗 + Roguelike 构筑，目标运行于微信小游戏（`compileType: game`）。

- 两章：晴空林地 → 熔岩群峰；每章有效飞行最多 3 分钟，升级时暂停。
- 天气随章节变化：晴天、微风、阵雨 → 热风、火雨；精英/Boss期间停止强天气。
- 每章一次中段精英、一次章末 Boss；击破回复生命，过章获得传奇遗物和技能。
- 六个起始流派、39 项已实现技能、6 件传奇遗物；最多混搭两派武器。
- 60秒飞行练习、重抽/放逐、暂停、后台保护和结算重开。

## 开始试玩

使用 Node.js 24（`.nvmrc`），依赖由 lockfile 固定。

```sh
npm ci
npm run verify
npm run preview:local
```

打开 [本机试玩](http://127.0.0.1:5173)。鼠标点击/触屏拍翅，浏览器也支持空格；先选流派再启程。
本地预览使用同一游戏包和浏览器 wx 适配，仅监听本机，不提供个人配置文件。
需要先熟悉手感时选择「60秒飞行练习」。当前没有音效、存档或联网功能。

微信工具导入 `dist/`；真实 AppID 只保存在忽略的 `wechat.local.json`，构建时注入忽略的 `dist/project.config.json`，不可提交到 GitHub。

```sh
npm run configure:wechat -- --appid <你的小游戏AppID> --lib-version <固定基础库版本>
npm run build
```

## 工程入口

- [章节与技能扩充](docs/design/CHAPTER_EXPANSION.md)：最新玩法范围；长期设计库共 78 项，首版实现 39 项。
- [原始技能图鉴](docs/design/SKILL_ATLAS.md)、[策划案](docs/design/GAME_DESIGN.md)：长期设计，冲突处以扩充文档为准。
- [试玩与验证记录](docs/testing/V0.2_PLAYTEST.md)：实测、限制、反馈要点。
- [任务看板](docs/tasks/BOARD.md)、[架构](docs/ARCHITECTURE.md)、[工作约定](AGENTS.md)。
- [版本管理](docs/VERSION_CONTROL.md)、[测试](docs/TESTING.md)、[微信CLI](docs/WECHAT_CLI.md)、[发布](docs/RELEASE.md)。

## 常用检查

| 命令                    | 用途                                                        |
| ----------------------- | ----------------------------------------------------------- |
| `npm run verify`        | 格式、类型、架构、设计、AppID隔离、规则测试、构建和产物冒烟 |
| `npm run simulate`      | 6流派 × 10种子完整两章脚本试跑，不修改生命                  |
| `npm run dev`           | 监听 TypeScript 并生成开发包                                |
| `npm run build:release` | 压缩候选构建，要求本地真实AppID和固定基础库                 |
| `npm run preview:local` | 启动本机试玩                                                |
| `npm run hooks:install` | 安装当前仓库提交检查                                        |

GitHub 指向 [用户指定仓库](https://github.com/XDwudi/snappy_bird1)。已确认账号有写权限，main和首版开发分支已同步；此前是 HTTPS 传输超时/空响应，未观察到权限拒绝。远端Actions因GitHub账号账单问题未启动，本地检查通过。
微信 CLI 已登录，AppID 已配置；Nightly 模拟器启动以及微信预览/上传服务仍失败，详见 [TASK-003](docs/tasks/TASK-003-wechat-integration.md)。本地试玩和 mock 测试不代表微信真机验收，也不代表正式发布。
