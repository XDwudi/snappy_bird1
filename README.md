# Snappy Bird

Flappy Bird 单指飞行 + roguelike 选卡成长的微信小游戏，使用 CommonJS 和 Canvas 2D，无 npm 运行依赖。

当前：**v1.7.0 测试候选**（2026-09-30），包含 61 张能力卡、草地/沙漠两章、天气、怪物、导弹和 Boss。微信开发者工具验证尚未完成，详见 [项目现状](docs/STATE.md)。

## 运行

1. 在微信开发者工具中导入本目录，选择「小游戏」。
2. 使用自己的小游戏 AppID；本机 `project.config.json` 和 `project.private.config.json` 不入 Git。
3. 编译后点击屏幕飞行，升级时三选一。

仓库：https://github.com/XDwudi/snappy_bird1.git 。2026-09-18 已按项目所有者要求以本地历史覆盖远程 main。

## 本轮玩法

- 前期管道小幅加压，保留高度变化限幅和第一章怪物保护。
- 第一章 Boss：击败它，或坚持 **45 秒**；第二章为 **60 秒**。
- 两种方式均获得章节礼包并推进章节；击杀额外计入讨伐徽章、战利品陈列。
- 倒计时只累计有效战斗帧，选卡、入场、转场、复活动画不计时。
- 草地Boss使用叶刃/俯冲，沙漠Boss使用沙墙/沙锥；预警、出招、破绽交替，破绽命中+1伤。
- 移除经验银行、二段跳、羽舞，加入疾风羽刃、风环护卫、逆羽反击；强化Boss与怪物动作反馈。
- 微信上传由用户手动操作，本轮只做本地测试。

## 验证

```sh
node test/test_v160.js
node test/test_v170.js
node test/test_balance_v160.js
node test/test_balance_v160.js --width=390 --height=844
node test/test_boss_sim.js
```

机制测试共30项，另用三组种子检查管道可达性。模拟不等于真人手机测试。`test_builds_v140.js` 保留历史构筑指标，当前仍返回失败，原因和实测见迭代文档。

## 交接索引

- [项目现状](docs/STATE.md)：当前完成项、验证限制和下一步。
- [本轮调整与测试](docs/iterations/迭代_v1.7.0_主题Boss与技能改造.md)：数值、测量口径、结果。
- [技能实效审查](docs/audits/技能审查_2026-09-30.md)：本轮替换、修复与保留理由。
- [接手时代码审计](docs/audits/审计_2026-09-18.md)：原版缺陷证据；修复状态见本轮迭代。
- `game/config/GameConfig.js`：难度、怪物、Boss 数值。
- `game/config/AbilityConfig.js`：卡牌说明与等级。
- `game/core/Game.js`：主循环、碰撞、奖励与 Canvas UI。
- `game/systems/`：生成、章节、能力、经验、天气。
- `game/entities/`：鸟、管道、怪物、导弹与 Boss 实体。
- [设计方案](docs/开发方案_v1.4.0.md)、[决策记录](docs/DECISIONS.md)、[开发手册](docs/handbook/开发手册.md)：历史设计与开发约定；最新用户要求和本轮决策优先。
