# Snappy Bird

Flappy Bird单指飞行 + roguelike成长的微信小游戏，CommonJS / Canvas 2D，无npm运行依赖。

当前为 **1.8.3 美术改造测试候选**（2026-10-02）：采用已确认的首版像素冒险风格，更新六章场景、角色与Boss、全部能力图标、界面和特效；保留1.8.2成长与操控修订的玩法数值。手机验收尚未完成，微信上传由用户手动进行。

## 运行

在微信开发者工具中导入本目录，选择“小游戏”，使用自己的小游戏AppID。编译后点击拍翅，升级选卡。本机项目配置不入Git。当前Nightly工具重开后仍报JSON解析启动异常，详情见[项目现状](docs/STATE.md)。

首次导入或重新生成本地配置后，运行 `node scripts/prepare_wechat.js`，再关闭并重新打开项目。此脚本保留AppID及编译设置，将测试、文档和工具脚本排除出上传包，避免Node测试代码被微信上传编译器解析。上传由用户手动完成。

同日已修复上传包超限：主包约 **2.85MB**，美术资源分包约 **3.82MB**。PNG尺寸、透明度与可见像素保持一致；重新打开微信项目使分包配置生效。

## 玩法

- 拍翅不吃属性增幅；轻羽只减缓下落，顺风等成长转为火力节奏。20级后经验需求递增，天气卡减负与增益可以共存。

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
node test/test_v182_balance.js
node test/test_v183.js
node scripts/check_package.js
node test/probe_v182_balance.js
node test/sim_v182_balance.js boss 4
node test/sim_v182_balance.js endless 8
```

116项回归（原有103项机制回归＋13项美术/交互/分包专项）；实际Canvas六章、攻击、教学、73张图标、短屏选卡与安全区检查通过。用户反馈已证明旧模拟不足以代表真人无尽时长；新版模拟仅作压力测试，具体结果与限制见迭代记录。

## 交接

- [1.8.3美术改造与验证](docs/iterations/迭代_v1.8.3_像素冒险美术改造.md)
- [六章实际画面](docs/audits/v183/six-chapters.png) · [飞行画面](docs/audits/v183/flight.png) · [短屏选卡](docs/audits/v183/cards-6-top.png)
- [素材目录、提示词与维护说明](docs/art/v1.8.3_素材说明.md)

- [1.8.2现行成长与操控修订](docs/iterations/迭代_v1.8.2_成长与操控平衡修订.md)
- [修订后技能卡](docs/audits/v182-balance/cards-short-screen.png)

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
