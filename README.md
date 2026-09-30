# Snappy Bird

Flappy Bird单指飞行 + roguelike成长的微信小游戏，CommonJS / Canvas 2D，无npm运行依赖。

当前为 **1.8.0 测试候选**（2026-09-30，用户指定版本号）：六章、六个主题Boss、73张技能卡、六大派系、通关后无尽模式。手机验收尚未完成，微信上传由用户手动进行。

## 运行

在微信开发者工具中导入本目录，选择“小游戏”，使用自己的小游戏AppID。编译后点击拍翅，升级选卡。本机项目配置不入Git。当前Nightly工具仍存在模拟器启动异常，详情见[项目现状](docs/STATE.md)。

首次导入或重新生成本地配置后，运行 `node scripts/prepare_wechat.js`，再关闭并重新打开项目。此脚本保留AppID及编译设置，将测试、文档和工具脚本排除出上传包，避免Node测试代码被微信上传编译器解析。上传由用户手动完成。

## 玩法

- 草地树灵、沙漠巨蝎、暗夜蛛后、冰川魔像、熔岩地龙、风暴机核：每个六招，后半程二/三连协。
- 每章同时满足管数与最低飞行时间后迎战。Boss可击杀或坚持倒计时通关；剧情战败20管后再挑战，不跳章。
- 73张卡随章节开放；同派系不同卡达到2/4张提供实际增益，卡面显示来源。
- 六章全部通关后进入无尽：得分双倍、等级无限、随机Boss按当前难度增强，直至死亡。
- 无尽以5–20分钟为平衡目标：5分钟后防御恢复受压，10分钟后进一步加速。模拟大多数样本达标，不能保证真人最低存活时间。

## 验证

```sh
node test/test_v160.js
node test/test_v170.js
node test/test_v180.js
node test/sim_v180.js boss 12
node test/sim_v180.js endless 30
```

48项机制回归；90局终盘构筑无尽模拟中位约7.0/8.2/12.2分钟，85局在5–20分钟内结束。模拟不等于手机测试。旧版本平衡脚本和历史结果保留作比较。

## 交接

- [项目现状](docs/STATE.md)
- [1.8.0设计、数值与验证](docs/iterations/迭代_v1.8.0_六章与无尽.md)
- [73张技能与六Boss审查](docs/audits/技能与Boss审查_1.8.0.md)
- [六章画面](docs/audits/v180/six-chapters.png)
- [无尽原始测量](docs/audits/v180/endless-simulation.json)

仓库：https://github.com/XDwudi/snappy_bird1.git 。当前参数入口：`game/config/CampaignConfig.js`、`CampaignAbilities.js`、`GameConfig.js`、`game/systems/EndlessScaling.js`。
