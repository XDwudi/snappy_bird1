# ADR-001：微信小游戏工程底座

- 日期：2026-09-18
- 状态：工程基线已采用；用户已明确Flappy+Roguelike，后续演进见ADR-002
- 触发：空仓库需要先建立可验证、可交接的 agent 开发基础

## 决策

1. 默认采用微信小游戏项目，入口为 `game.js` 和 `game.json`，`compileType` 为 `game`。
2. 轻量单机 2D 作为暂定范围，使用 TypeScript strict + Canvas 2D，不提前实现具体玩法。
3. esbuild 将代码打包为单文件 IIFE；运行包不依赖 Node/DOM；官方 `minigame-api-typings` 提供类型。
4. 工具链使用 Node.js 24 + npm lockfile；本机也允许 Node 25/26，CI 固定 24。
5. Node 内置测试、Prettier、类型检查和分层检查组成质量门禁；GitHub Actions 提供远端模板。
6. 一个仓库、短分支、SemVer。没有真实后端需求时不引入服务器、数据库或 monorepo。

## 理由和代价

文本代码易于 agent 理解和评审，少依赖便于复现，纯玩法逻辑可在 Node 中测试。
代价是没有引擎的可视化场景编辑、动画和物理系统；复杂游戏继续原生实现会增加成本。
用户若确认普通小程序内嵌游戏，需要页面生命周期、Canvas 节点和另一套构建入口；
不能将此小游戏产物直接当作普通小程序发布。

## 重新评估条件

复杂 3D、重动画、多关卡可视化编辑、多人联机成为核心诉求，或目标平台变成普通小程序。
决定改变后新增 ADR，标记本条被取代，保留历史决策记录。

## 参考与核查边界

2026-09-18 核查了微信官方组织维护的
[项目配置示例](https://github.com/wechat-miniprogram/minigame-demo/blob/master/project.config.json)、
[游戏配置示例](https://github.com/wechat-miniprogram/minigame-demo/blob/master/miniprogram/game.json) 和
[TypeScript 类型定义](https://github.com/wechat-miniprogram/minigame-api-typings)。
只参考文件结构和类型接入方式，不沿用示例账号或旧基础库版本。
[微信小游戏开发文档](https://developers.weixin.qq.com/minigame/dev/guide/) 本次自动检索无法读取，
包体限制、账号资质和审核要求不在这里固化为已核实的最新政策，发布时按后台和官方文档复核。
