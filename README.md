# Snappy Bird

Flappy Bird单指飞行 + roguelike成长的微信小游戏，CommonJS / Canvas 2D，无npm运行依赖。

当前为 **1.8.1 测试候选**（2026-09-30）：六种Boss破解机关、两种伴飞精英、73张技能卡、六大派系、图形红黄心与无尽恢复约束。手机验收尚未完成，微信上传由用户手动进行。

## 运行

在微信开发者工具中导入本目录，选择“小游戏”，使用自己的小游戏AppID。编译后点击拍翅，升级选卡。本机项目配置不入Git。当前Nightly工具仍存在模拟器启动异常，详情见[项目现状](docs/STATE.md)。

首次导入或重新生成本地配置后，运行 `node scripts/prepare_wechat.js`，再关闭并重新打开项目。此脚本保留AppID及编译设置，将测试、文档和工具脚本排除出上传包，避免Node测试代码被微信上传编译器解析。上传由用户手动完成。

## 玩法

- 六个Boss各六招及P2连协，并有拆根、诱撞、破卵、蓄热、开阀、按序断路六种破解方式。
- 每章同时满足管数与最低飞行时间后迎战。Boss可击杀或坚持倒计时通关；剧情战败20管后再挑战，不跳章。
- 73张卡随章节开放；同派系不同卡达到2/4张提供实际增益，卡面显示来源。
- 六章全部通关后进入无尽：得分双倍、等级无限、随机Boss按当前难度增强，直至死亡。
- 无尽两分钟后压缩回血/回盾/无敌时间，五分钟后加速增压；不再反复回满血。5–20分钟仍需手机验收。
- 普通怪靠近管道出口；炮艇伴飞射击，天气精英促进多天气，击杀可快速驱散。普通生命红心，临时生命黄心。

## 验证

```sh
node test/test_v160.js
node test/test_v170.js
node test/test_v180.js
node test/test_v181.js
node test/sim_v181.js boss 8
node test/sim_v181.js endless 30
```

71项机制回归；实际Canvas三屏画面检查通过。用户反馈已证明旧模拟不足以代表真人无尽时长；新版模拟仅作压力测试，具体结果与限制见迭代记录。

## 交接

- [1.8.1玩法、数值与验收](docs/iterations/迭代_v1.8.1_Boss机关与精英.md)
- [1.8.1六种机关](docs/audits/v181/six-chapters.png)
- [1.8.1精英画面](docs/audits/v181/elites.png)
- [项目现状](docs/STATE.md)
- [1.8.0设计、数值与验证](docs/iterations/迭代_v1.8.0_六章与无尽.md)
- [1.8.0历史技能与Boss审查](docs/audits/技能与Boss审查_1.8.0.md)
- [1.8.0历史画面](docs/audits/v180/six-chapters.png)
- [1.8.0历史模拟](docs/audits/v180/endless-simulation.json)

仓库：https://github.com/XDwudi/snappy_bird1.git 。当前参数入口：`game/config/CampaignConfig.js`、`CampaignAbilities.js`、`GameConfig.js`、`game/systems/EndlessScaling.js`。
