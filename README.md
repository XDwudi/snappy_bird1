# Snappy Bird

Flappy Bird单指飞行 + roguelike成长的微信小游戏，CommonJS / Canvas 2D，无npm运行依赖。

当前为 **1.8.2 测试候选**（2026-10-01）：Boss多轮弹幕与明确穿盾预警、章节开战时限、四种成长精英、低生命红框，保留73张卡与六派系。手机验收尚未完成，微信上传由用户手动进行。

## 运行

在微信开发者工具中导入本目录，选择“小游戏”，使用自己的小游戏AppID。编译后点击拍翅，升级选卡。本机项目配置不入Git。当前Nightly工具重开后仍报JSON解析启动异常，详情见[项目现状](docs/STATE.md)。

首次导入或重新生成本地配置后，运行 `node scripts/prepare_wechat.js`，再关闭并重新打开项目。此脚本保留AppID及编译设置，将测试、文档和工具脚本排除出上传包，避免Node测试代码被微信上传编译器解析。上传由用户手动完成。

## 玩法

- 六个Boss各六招及P2连协，并有拆根、诱撞、破卵、蓄热、开阀、按序断路六种破解方式。
- 每章管数与最低时间达标，或达到最长时间即迎战。Boss可击杀或生存通关；剧情战败20管或35秒后再挑战，不跳章。
- 73张卡随章节开放；同派系不同卡达到2/4张提供实际增益，卡面显示来源。
- 六章全部通关后进入无尽：得分双倍、等级无限、随机Boss按当前难度增强，直至死亡。
- 无尽两分钟后压缩回血/回盾/无敌时间，五分钟后加速增压；不再反复回满血。5–20分钟仍需手机验收。
- 普通怪靠近管道出口；精英包括炮艇、天气灵、棱镜哨兵、孢雷水母，按章节与无尽时间成长。普通生命红心、临时生命黄心，剩1红心显示危险边框。

## 验证

```sh
node test/test_v160.js
node test/test_v170.js
node test/test_v180.js
node test/test_v181.js
node test/test_v182.js
node test/sim_v182.js boss 4
node test/sim_v182.js endless 8
```

87项机制回归；实际Canvas攻击、教学与短屏低血画面检查通过。用户反馈已证明旧模拟不足以代表真人无尽时长；新版模拟仅作压力测试，具体结果与限制见迭代记录。

## 交接

- [1.8.2玩法、数值与验收](docs/iterations/迭代_v1.8.2_Boss压力与遭遇节奏.md)
- [1.8.2六套Boss指引](docs/audits/v182/boss-guides.png)
- [1.8.2精英画面](docs/audits/v182/elites.png)

- [1.8.1玩法、数值与验收](docs/iterations/迭代_v1.8.1_Boss机关与精英.md)
- [1.8.1六种机关](docs/audits/v181/six-chapters.png)
- [1.8.1精英画面](docs/audits/v181/elites.png)
- [项目现状](docs/STATE.md)
- [1.8.0设计、数值与验证](docs/iterations/迭代_v1.8.0_六章与无尽.md)
- [1.8.0历史技能与Boss审查](docs/audits/技能与Boss审查_1.8.0.md)
- [1.8.0历史画面](docs/audits/v180/six-chapters.png)
- [1.8.0历史模拟](docs/audits/v180/endless-simulation.json)

仓库：https://github.com/XDwudi/snappy_bird1.git 。当前参数入口：`game/config/CampaignConfig.js`、`CampaignAbilities.js`、`GameConfig.js`、`game/systems/EndlessScaling.js`。
